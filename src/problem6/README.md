# Scoreboard Service — Module Specification

> Problem 6 — 99techteam code-challenge
> Target audience: backend engineering team implementing this module.

---

## 1. Overview

This module powers a **live Top-10 scoreboard** for a website. Any authenticated user can perform an in-app action that increases their score; the leaderboard must reflect every valid score change in real time, across every connected client, without allowing malicious actors to inflate scores.

The module owns:

- A **secured HTTP endpoint** that records a score increment.
- A **real-time push channel** (WebSocket, with SSE fallback) that broadcasts leaderboard updates.
- A **read endpoint** for the current Top-10 (used on initial page load and as a fallback).
- An **authorization + anti-abuse layer** that validates every score change against a server-issued, single-use action token.

Out of scope: the action itself (game, quiz, button click — whatever triggers the score change). This module treats the action as opaque and only verifies that the action was legitimately completed.

---

## 2. Terminology

| Term | Meaning |
|---|---|
| **User** | An authenticated account with a stable `user_id`. |
| **Action** | Any client-side event that earns points. Opaque to this module. |
| **Action token** | A short-lived, single-use, server-signed token (JWT) that authorizes exactly one score increment for one user. |
| **Score** | Monotonic non-negative integer stored per user. |
| **Leaderboard** | Top 10 users by score, ties broken by earliest `updated_at`. |

---

## 3. Public API

All endpoints are versioned under `/api/v1`. All requests require a valid **session JWT** in the `Authorization: Bearer <token>` header unless otherwise noted.

### 3.1 `POST /api/v1/actions/start`

Issues an **action token** — the server's commitment that the holder is allowed to submit exactly one score update for this user.

**Request**
```json
{ "action_type": "quiz_complete" }
```

**Response 200**
```json
{
  "action_token": "<JWT>",
  "expires_at": "2026-11-12T14:32:10Z"
}
```

**JWT claims** (HS256 or RS256, 60 s TTL):
```json
{
  "jti": "a1b2c3…",          // unique token id, stored server-side for single-use enforcement
  "sub": "user_42",           // bound to this user only
  "act": "quiz_complete",
  "pts": 10,                  // server-decided reward for this action (NEVER trust client)
  "iat": 1731420670,
  "exp": 1731420730,
  "nonce": "7f9a…"            // random
}
```

Errors: `401` (no session), `429` (user is issuing tokens too fast).

---

### 3.2 `POST /api/v1/scores/increment`

Applies the score increment and broadcasts the new leaderboard if it changed.

**Request**
```json
{ "action_token": "<JWT from /actions/start>" }
```

**Response 200**
```json
{
  "user_id": "user_42",
  "new_score": 1180,
  "rank": 7,
  "leaderboard_changed": true
}
```

**Server-side checks** (in order — fail fast):
1. Session JWT is valid and not revoked.
2. `action_token` signature verifies with the current key.
3. `action_token.sub == session.user_id` — token cannot be used by a different account.
4. `action_token.exp` is in the future.
5. `action_token.jti` has not been consumed before (atomic `SETNX` in Redis with the token's remaining TTL as the key's TTL).
6. User account is not banned / shadow-banned.
7. Rate limiter for this user has budget (e.g. ≤ 30 increments/min).

Only then: `UPDATE user_scores SET score = score + $pts, updated_at = now() WHERE user_id = $sub RETURNING score`, inside the same transaction as the Redis `SETNX`. If Redis says the token was already used, the transaction rolls back — idempotency is guaranteed.

Errors: `401` (session), `403` (ban), `409` (`token_already_used`), `410` (`token_expired`), `422` (`token_user_mismatch`), `429` (rate limit).

---

### 3.3 `GET /api/v1/scoreboard/top`

Returns the current Top-10. Cached; cheap to call.

**Response 200**
```json
{
  "generated_at": "2026-11-12T14:31:02Z",
  "entries": [
    { "rank": 1, "user_id": "user_7",  "username": "alice", "score": 9820 },
    { "rank": 2, "user_id": "user_12", "username": "bob",   "score": 8740 },
    ...
  ]
}
```

No auth required (public leaderboard). Served from an in-memory copy of the Redis sorted-set; the HTTP handler never touches the primary database.

---

### 3.4 `GET /api/v1/scoreboard/stream` (WebSocket)

Clients connect here immediately after page load. Server pushes a single message type:

```json
{
  "type": "leaderboard.updated",
  "generated_at": "2026-11-12T14:31:02Z",
  "entries": [ /* same shape as /scoreboard/top */ ]
}
```

- **Transport**: WebSocket (`wss://`). Server advertises an SSE fallback at `/api/v1/scoreboard/events` for clients that can't open WS (corporate proxies).
- **Backpressure**: slow clients are dropped after their send-buffer exceeds 64 KB.
- **Heartbeat**: server sends a `ping` frame every 20 s; clients that miss two are disconnected.
- **Auth**: optional session JWT in the subprotocol; anonymous viewers are allowed (public leaderboard).

Server emits a message **only when** the Top-10 set or ordering actually changed — a score bump that leaves the Top-10 unchanged does **not** cause a broadcast.

---

## 4. Data model

**PostgreSQL** (source of truth):

```sql
CREATE TABLE user_scores (
  user_id     TEXT PRIMARY KEY,
  score       BIGINT NOT NULL DEFAULT 0 CHECK (score >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_scores_top ON user_scores (score DESC, updated_at ASC);

CREATE TABLE score_events (        -- append-only audit log
  id           BIGSERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL,
  action_type  TEXT NOT NULL,
  points       INT  NOT NULL,
  action_jti   TEXT NOT NULL UNIQUE, -- enforces single-use at the DB layer too
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Redis** (hot path):

- `ZSET scoreboard:global` — every user's current score. `ZREVRANGE 0 9 WITHSCORES` gives the Top-10 in O(log N).
- `SET action_token:<jti>` with the token's remaining TTL — enforces single-use outside the DB without a round trip.
- `STRING rate:increment:<user_id>` — sliding-window counter for rate limiting.

Postgres is authoritative; Redis is a cache that is rebuilt from `user_scores` on cold start and kept in sync inside the same transaction as the score update (using an outbox pattern — see §7).

---

## 5. Live-update pipeline

A single process (or a small pool behind a consistent-hash LB) owns the **leaderboard broadcaster**:

1. `POST /scores/increment` commits the Postgres transaction and writes an outbox row.
2. The broadcaster subscribes to the outbox (via `LISTEN/NOTIFY` or a CDC stream) and receives the change.
3. It performs `ZADD` on `scoreboard:global`, then reads `ZREVRANGE 0 9 WITHSCORES`.
4. If the serialized Top-10 differs from the one held in memory, it:
   - updates its in-memory snapshot,
   - publishes the new snapshot to a Redis Pub/Sub channel `scoreboard.updates`.
5. Every API node subscribes to `scoreboard.updates` and fans the message out to its own WebSocket clients.

This keeps HTTP writers decoupled from WebSocket I/O, and lets us horizontally scale the WebSocket layer independently.

---

## 6. Flow diagram

```mermaid
sequenceDiagram
  autonumber
  participant C as Client (browser)
  participant API as API server
  participant R as Redis
  participant PG as PostgreSQL
  participant B as Broadcaster
  participant WS as WebSocket layer

  Note over C,WS: Page load
  C->>API: GET /scoreboard/top (+ open WS /scoreboard/stream)
  API-->>C: Top-10 snapshot
  WS-->>C: connected

  Note over C,PG: User completes an action
  C->>API: POST /actions/start (session JWT)
  API->>API: issue signed action_token (jti, sub, pts, 60s exp)
  API-->>C: { action_token }

  C->>API: POST /scores/increment { action_token }
  API->>API: verify signature + sub == session.user_id
  API->>R: SETNX action_token:<jti> (TTL = remaining)
  alt token already used
    R-->>API: not set
    API-->>C: 409 token_already_used
  else first use
    R-->>API: OK
    API->>PG: BEGIN; UPDATE user_scores; INSERT score_events; outbox row; COMMIT
    PG-->>API: new_score, rank
    API-->>C: 200 { new_score, rank }
  end

  PG-->>B: outbox notification
  B->>R: ZADD scoreboard:global
  B->>R: ZREVRANGE 0 9 WITHSCORES
  alt Top-10 changed
    B->>R: PUBLISH scoreboard.updates
    R-->>WS: fan-out to every API node
    WS-->>C: { type: "leaderboard.updated", entries }
  else unchanged
    B-->>B: no broadcast
  end
```

---

## 7. Security & anti-abuse

| Threat | Mitigation |
|---|---|
| Direct call to `/scores/increment` without doing the action | Requires an `action_token` whose `jti` was issued by `/actions/start`; without one the request is `401`. |
| Replaying the same `action_token` many times | `jti` is single-use: enforced by Redis `SETNX` **and** by `UNIQUE (action_jti)` on `score_events`. |
| Using another user's `action_token` | Token's `sub` claim must equal the authenticated session's `user_id`. |
| Client-supplied point value | The `pts` field lives **inside the signed token**, computed and signed by the server. The client cannot set it. |
| Botting / scripted mass-completion | Per-user sliding-window rate limit on `/actions/start` **and** `/scores/increment`. Suspicious users are flagged for review; verified bots trigger shadow-ban (writes accepted but ignored). |
| Stolen session token | Short-lived session JWTs (≤ 1 h) with refresh rotation; session revocation list in Redis. |
| Horizontal clock skew between nodes | Token validation uses NTP-synced server time with ±30 s skew tolerance. |
| WebSocket DoS | Per-IP connection cap, heartbeat timeout, send-buffer cap. Public leaderboard endpoint is cache-fronted so an attacker can't force expensive DB reads. |

For actions that are especially valuable or server-side verifiable, add an `evidence` field to `/actions/start` (e.g. a quiz answer, an HMAC of game state). The server verifies the evidence before issuing the token, so forging a request still requires completing the action.

---

## 8. Observability

- **Metrics** (Prometheus): `score_increments_total{outcome}`, `action_token_rejections_total{reason}`, `leaderboard_broadcasts_total`, `ws_clients_connected`, histograms for each endpoint's latency.
- **Structured logs** with `request_id`, `user_id`, `action_jti` on every write — so an incident can be replayed from the audit log.
- **Alerts**: spike in `token_already_used` (replay attack), spike in `token_user_mismatch` (token theft), drop to zero in `leaderboard_broadcasts_total` with non-zero increments (broadcaster down).

---

## 9. Testing requirements

- Unit tests for token issue/verify, including every rejection reason in §3.2.
- Integration test: 1000 concurrent increments for different users → DB score sum matches; Top-10 is correct; exactly one broadcast per Top-10 change.
- Replay test: fire the same `action_token` twice from two nodes simultaneously → one `200`, one `409`.
- Load test: 10k WS clients, sustained 500 increments/s, p99 end-to-end (increment → WS message) < 500 ms.
- Chaos test: kill the broadcaster mid-burst → on restart, it rebuilds from `score_events` and resumes without duplicating broadcasts.

---

## 10. Suggested improvements (for product/tech discussion)

These were intentionally left out of the core spec to keep v1 shippable, but the team should weigh them before implementation:

1. **Per-category leaderboards.** `scoreboard:global` is one `ZSET`; the same mechanism supports `scoreboard:weekly`, `scoreboard:game_<id>`, etc. Add a URL segment (`/scoreboard/{scope}/top`) rather than hard-coding "global".
2. **Delta broadcasts.** The spec broadcasts the full Top-10 on every change (~1 KB). For very high write rates this is fine; at sustained >1 k events/s, consider sending `{ added, removed, reordered }` deltas.
3. **Signed cursor for pagination.** If the UI later shows "your rank + nearby", expose `GET /scoreboard/around/{user_id}` using `ZRANK` + `ZRANGE`.
4. **Action scoring in a config service.** Currently the server picks `pts` at token issue time. Make the point table a config entry so game designers can tune rewards without a code deploy.
5. **CAPTCHA / proof-of-work on `/actions/start`** when a user's rate-limit score crosses a threshold — gentler than a hard 429.
6. **Backfill endpoint.** `POST /admin/scores/recompute` that re-reads `score_events` and rebuilds `user_scores` + Redis. Invaluable after an incident.
7. **GDPR delete.** On account deletion, a background job must remove the user from `user_scores` and the Redis `ZSET`, keeping `score_events` only in anonymized form.
8. **WebSocket auth hardening.** If the leaderboard later becomes private-per-tenant, move the auth check into the WS handshake and scope `scoreboard.updates` channels per tenant.
9. **Tie-breaking rule.** The spec uses `updated_at ASC` for ties. Confirm with product — some games prefer `user_id` lexicographic so the order is stable over refreshes.
10. **Outbox vs. CDC.** The spec uses an outbox table because it is boring and portable. If the org already runs Debezium/Kafka, dropping the outbox and consuming the WAL directly is cleaner.

---

## 11. Deliverables for the implementing team

- [ ] Endpoints §3.1–3.4 with contract tests matching the schemas above.
- [ ] Postgres migrations for §4.
- [ ] Redis initialization + warm-start script (rebuild `ZSET` from `user_scores`).
- [ ] Broadcaster service + health check.
- [ ] Rate-limit middleware.
- [ ] Prometheus metrics and dashboards.
- [ ] OpenAPI (`openapi.yaml`) generated from the handlers.
- [ ] Runbook: how to replay `score_events` after an incident.
