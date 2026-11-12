# 99techteam Code Challenge — Submission

Solutions for the [99techteam/code-challenge](https://github.com/99techteam/code-challenge)
problems, organised to match the official skeletal structure.

| Problem | Topic                                   | Folder                                   |
|---------|-----------------------------------------|------------------------------------------|
| 2       | Fancy Form — currency swap UI           | [`src/problem2`](src/problem2)           |
| 4       | Three ways to sum to n                  | [`src/problem4`](src/problem4)           |
| 5       | CRUD API (Express + TypeScript)         | [`src/problem5`](src/problem5)           |
| 6       | Scoreboard module — architecture spec   | [`src/problem6`](src/problem6)           |

Each folder has its own `README.md` with run instructions and design notes.

## Quick index

### Problem 2 — Fancy Form
Vite + React + TypeScript + Tailwind v4 + shadcn/ui. Live token prices from
`interview.switcheo.com/prices.json`, token icons from the Switcheo repo,
bidirectional input sync, token-picker modal with search, validation, loading
simulation, success dialog. See [`src/problem2/README.md`](src/problem2/README.md).

```bash
cd src/problem2 && npm install && npm run dev
```

### Problem 4 — Three ways to sum to n
Three distinct TypeScript implementations with complexity analysis, shared
input validation (safe-integer guard, signed-sum convention for negative n),
and runnable tests cross-checking all three against random inputs. See
[`src/problem4/README.md`](src/problem4/README.md).

```bash
cd src/problem4 && npm install && npm test
```

### Problem 5 — CRUD API
Express 4 + TypeScript strict + SQLite (`better-sqlite3`) + Zod. Five REST
endpoints under `/api/resources` with list filters (`q`, `category`,
`status`), pagination, sort, and a consistent error envelope. See
[`src/problem5/README.md`](src/problem5/README.md).

```bash
cd src/problem5 && npm install && npm run dev
```

### Problem 6 — Scoreboard module
Backend module specification for a live Top-10 scoreboard with action-token
based anti-abuse. REST + WebSocket API, Postgres + Redis data model, outbox
pattern for fan-out, Mermaid sequence diagram, security threat table, and a
list of suggested improvements. See [`src/problem6/README.md`](src/problem6/README.md).
