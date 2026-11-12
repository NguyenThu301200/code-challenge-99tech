# Problem 5 — CRUD API (Express + TypeScript + SQLite)

A small, typed Express server exposing a REST CRUD interface for a generic **Resource**
(name, description, category, status), persisted in SQLite.

## Stack

- **Node.js** 20+
- **Express 4** (routing, middleware)
- **TypeScript 5** (strict, `noUncheckedIndexedAccess`)
- **better-sqlite3** (synchronous, file-based — zero-config persistence)
- **Zod** (request validation)
- **tsx** (dev/runtime loader — no build step needed)

## Project layout

```
src/
├── index.ts        # Express app bootstrap, error handler
├── routes.ts       # Route handlers + validation glue
├── repository.ts   # SQL queries (prepared statements)
├── schemas.ts      # Zod schemas for request bodies / params / queries
├── db.ts           # SQLite connection + migration (CREATE TABLE IF NOT EXISTS)
└── errors.ts       # HttpError class
```

## Configuration

Set via environment variables — all optional:

| Variable | Default        | Purpose                     |
|----------|----------------|-----------------------------|
| `PORT`   | `3000`         | HTTP port                   |
| `DB_PATH`| `./data/app.db`| SQLite file path (auto-created) |

## Run

```bash
npm install
npm run dev          # tsx watch, hot reload
# or
npm start            # one-shot
# or
PORT=4000 DB_PATH=./data/custom.db npm start
```

Server logs `✓ CRUD API listening on http://localhost:<PORT>` when ready.

## API

Base path: `/api`. All request/response bodies are JSON.

### `GET /health`
Liveness probe.

### `POST /api/resources`
Create a resource.

Request body:
```json
{
  "name": "Alpha Booth",         // required, 1–200 chars
  "category": "booth",           // required, 1–60 chars
  "description": "1-person pod", // optional, default ""
  "status": "active"             // optional, "active" | "archived", default "active"
}
```
Response: **201** with the created resource (including auto `id`, `created_at`, `updated_at`).

### `GET /api/resources`
List resources with filters + pagination.

Query params:
| Param     | Type    | Default        | Notes |
|-----------|---------|----------------|-------|
| `q`       | string  | —              | Substring search over `name` and `description` |
| `category`| string  | —              | Exact match |
| `status`  | enum    | —              | `active` or `archived` |
| `limit`   | number  | `20`           | 1–100 |
| `offset`  | number  | `0`            | ≥ 0 |
| `sort`    | enum    | `created_at`   | `created_at` \| `updated_at` \| `name` |
| `order`   | enum    | `desc`         | `asc` \| `desc` |

Response:
```json
{
  "items": [ /* Resource[] */ ],
  "pagination": { "total": 42, "limit": 20, "offset": 0, "has_more": true }
}
```

### `GET /api/resources/:id`
Fetch one resource by id. **404** if missing.

### `PATCH /api/resources/:id`
Partial update. Send only the fields you want to change. The response is the full updated resource. **404** if missing.

### `DELETE /api/resources/:id`
Returns **204** on success, **404** if missing.

## Error format

All errors use a consistent envelope:
```json
{ "error": { "code": "validation_error", "message": "Required" } }
```
Codes: `validation_error` (400), `not_found` (404), `internal_error` (500).

## Quick smoke test

With the server running:

```bash
BASE=http://localhost:3000/api
curl -s -X POST $BASE/resources -H 'Content-Type: application/json' \
  -d '{"name":"Alpha Booth","category":"booth","description":"1-person pod"}'
curl -s "$BASE/resources?category=booth"
curl -s "$BASE/resources/1"
curl -s -X PATCH $BASE/resources/1 -H 'Content-Type: application/json' \
  -d '{"status":"archived"}'
curl -s -X DELETE $BASE/resources/1 -o /dev/null -w "%{http_code}\n"
```

## Notes / possible improvements

These were intentionally left out to keep the module small; worth considering before
shipping to production:

- **Auth**: endpoints are public today. Add a JWT or API-key middleware per route.
- **Request IDs + structured logging** (pino + `x-request-id`) — the current `console.log` is dev-only.
- **OpenAPI** generated from the Zod schemas (e.g. `zod-to-openapi`) for client SDKs and docs UI.
- **Rate limiting** on writes (`express-rate-limit`).
- **CORS** — add `cors` middleware when a browser client needs access.
- **Dockerfile** + healthcheck for container deploys.
- **Tests** — Vitest + supertest for the happy path and each error branch.
- **DB switch** — SQLite is perfect for the exercise; swap `repository.ts` + `db.ts`
  for Postgres (via `pg` or a lightweight ORM like Drizzle) when you need real
  concurrency and backups.
