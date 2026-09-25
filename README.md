# TaskFlow

A collaborative task-board app (Trello/Jira-style): create projects, invite members,
manage tasks on a board, and see teammates' changes live via WebSockets.

Production-ready full-stack repo: **FastAPI + SQLAlchemy + PostgreSQL** backend with
native WebSockets, **Next.js (pages router, plain CSS)** frontend, JWT access tokens +
rotating opaque refresh tokens.

## How the 4 skill packs were used

| Pack | Role in this build |
|------|-------------------|
| **miniMAX `fullstack-dev`** | Mandatory workflow: architecture decisions → scaffold checklist → implement → verify. 7 Iron Rules enforced (feature-first `features/{auth,projects,tasks,dashboard}`, router→service→repository, typed config fail-fast, typed errors + global handler, JSON logging + request ID, migrations, validation, `/health`+`/ready`, graceful shutdown, explicit CORS, security headers, `.env.example`). Integration checklist on frontend (typed fetch, env base URL, 401-refresh retry, loading/empty/error states). |
| **ECC (`backend-patterns`, `api-design`, `coding-standards`)** | REST `/api/v1/*` resource naming, correct status codes (201+Location, 204, 401/403/404/409/422/429), envelopes `{data}` / `{data,meta,links}` / `{error:{code,message,details}}`, offset pagination + filtering/sorting, Pydantic boundary validation, RBAC (owner vs member), no `*` CORS, no stack-trace leaks. |
| **Matt Skills (`tdd`, `code-review`, `domain-modeling`)** | Seams fixed at HTTP routers + WS manager; behavior tested through public interfaces (`backend/tests/test_api.py`, 10 tests green). Vertical slices (auth → projects → tasks → WS). Review rules: no business logic in routers, no HTTP types in services, early returns, named constants. |
| **UI-UX-Pro-Max + miniMAX `frontend-dev`** | Generated design system below (Flat Design, Plus Jakarta Sans, green/gold palette, WCAG AAA). Frontend rules applied: no Tailwind/shadcn, plain CSS tokens, no Inter, no purple/blue gradients, no emojis (SVG only), `min-h-[100dvh]`, responsive 375/768/1024/1440, focus rings, `prefers-reduced-motion`, skeleton/empty/error on every data page. |

Design system (from `ui-ux-pro-max search.py "SaaS productivity dashboard" --design-system -p TaskFlow`):
- **Pattern:** Real-Time / Operations. **Style:** Flat Design, minimalist 2D, no shadows/gradients, 150–200ms hovers, excellent perf, WCAG AAA.
- **Colors:** `--color-primary #15803D`, `--color-secondary #166534`, `--color-accent #D97706`, bg `#F8FAFC`, fg `#0F172A`, muted `#64748B`, border `#E2E8F0`, destructive `#DC2626`, ring `#15803D`.
- **Typography:** Plus Jakarta Sans (headings + body), tight tracking, relaxed body, max 65ch. See `frontend/styles/globals.css`.

## Stack & why

- **Backend:** FastAPI — native `WebSocket` support + DI lets HTTP routes and sockets share the same membership/role checks. SQLAlchemy 2.0 + Alembic + PostgreSQL for FKs, unique constraints, cascading deletes. `slowapi` rate limits on `/api/v1/auth/*`.
- **Frontend:** Next.js pages router — smallest friction for a handful of routes; plain CSS keeps the bundle small and matches the Flat-Design system without a Tailwind dependency.
- **Real-time:** native `/ws` WebSocket, not polling (bidirectional board updates + comments + member events).

## Running it (clean clone)

Requirements: Docker + Docker Compose.

```bash
git clone <this-repo> && cd taskflow
docker compose up --build
# seed demo data (new terminal):
docker compose exec backend python seed.py
```

Starts `db` (Postgres :5432), `backend` (FastAPI :8000), `frontend` (Next.js :3000).
Seed creates `alice@example.com` / `password123` (owner of "Demo Sprint"),
`bob@example.com` / `password123` (member), 4 tasks + 1 comment.

Open `http://localhost:3000` in two windows (normal + incognito), log in as Alice
and Bob, open "Demo Sprint" in both → move a card, watch it update live.
Connection pill shows **Live / Reconnecting**.

Without Docker:

```bash
# backend (needs Postgres; SQLite works for dev via DATABASE_URL=sqlite:///./taskflow.db)
cd backend && cp .env.example .env && pip install -r requirements.txt
uvicorn app.main:app --reload   # :8000, /health, /ready, docs at /docs

# frontend
cd frontend && cp .env.example .env.local && npm install && npm run dev  # :3000
```

Env: backend `.env` (`DATABASE_URL`, `JWT_SECRET` ≥32 chars, `CORS_ORIGINS`,
`JWT_EXPIRES_MIN=15`, `REFRESH_DAYS=7`); frontend `.env.local`
(`NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_WS_URL=ws://localhost:8000`).

## Data model

```
users: id(UUID) name email(unique) password_hash created_at
refresh_tokens: id user_id->users token_hash(SHA256) expires_at revoked
projects: id name description owner_id->users created_at
project_members: id project_id->projects user_id->users role[owner|member] joined_at, unique(project_id,user_id)
tasks: id project_id->projects title description status[To Do|In Progress|Done] priority[Low|Medium|High]
       due_date completed_at assignee_id->users(NULL on member removal) created_by->users(kept) created_at updated_at
comments: id task_id->tasks user_id->users content created_at
activity_log: id project_id->projects user_id->users event_type description created_at
```

- `project_members` is the users↔projects join table carrying `role` (one role per membership).
- Removing a member deletes only the membership row; their created tasks/comments stay, `assignee_id` on their tasks is cleared (SET NULL).
- Deleting a project cascades to members, tasks→comments, activity (`delete-orphan`) — no orphans.
- UUIDs: native `UUID` on Postgres, `CHAR(36)` fallback on SQLite via `GUID` TypeDecorator (`backend/app/db/base.py`), so the same models run in tests.

## Auth & refresh flow

- Passwords: min 8 chars, ≥1 letter + ≥1 digit, ≤72 UTF-8 bytes (bcrypt has a 72-byte input limit). Hashed with `bcrypt.hashpw` **directly** — `passlib` is avoided because its bcrypt backend probes `bcrypt.__about__`, removed in bcrypt 4.1+. DB stores only `password_hash`, never plaintext.
- Email: normalized to lowercase (stored and compared lowercased/stripped). Name: required, max 100 chars.
- Access token: JWT HS256, 15 min, claims `{sub:user_id}` only. Sent as `Authorization: Bearer`. The access token is held in frontend memory rather than localStorage. This avoids durable token persistence in browser storage and limits the lifetime of a stolen access token to its short expiry window. It does not itself protect against XSS running in the application context. Lost on hard refresh → silent `POST /api/v1/auth/refresh` on app start recovers it.
- Refresh token: 7-day opaque random string, stored **httpOnly, SameSite=Lax, Path=/api/v1/auth** cookie (JS can't read it). Server stores only its SHA-256 hash (`refresh_tokens.token_hash`).
- Refresh (`POST /api/v1/auth/refresh`): look up hash → 401 if missing/revoked/expired (datetimes normalized to UTC-aware for SQLite/Postgres parity) → else revoke old row, issue new token + cookie (**rotation**). **Reuse of a revoked token revokes all active refresh sessions for the affected user** and returns 401 with no new token — the model has no `family_id`, so reuse is treated as possible theft of any session and every session is killed. A stolen cookie can't survive alongside legitimate sessions.
- Concurrent 401s: frontend `lib/api.js` uses a **single-flight** shared refresh promise — exactly one `/refresh` in flight; all waiting requests retry once with the rotated token. The refresh call itself never re-triggers refresh (no loops).
- Logout (`POST /api/v1/auth/logout`): revokes refresh tokens, clears cookie. **Deliberate tradeoff:** logout ends refresh ability immediately, but an already-issued stateless access JWT stays valid until its short expiry (≤15 min). No server-side access-token blacklist by design.
- Membership: every project-scoped backend endpoint verifies project membership itself (never trusts the client) — non-members get 403, enforced in `projects/service.py:require_membership` and `tasks/router.py:_require_member`, including comments, activity, and WS room joins.
- Rate limited: `slowapi` on auth routes; 429 returns `{error:{code:RATE_LIMITED}}`.

## WebSocket setup

- Connect: `ws://host/ws?token=<access_token>` (browsers can't set headers on WS handshake, so the same JWT goes in query). Invalid/missing → close 4401.
- Scoping: a socket receives **nothing** until it sends `{"action":"join","project_id":"..."}`. Server re-checks DB membership **before** adding the socket to that project's in-memory room. All project broadcasts (`task_created/updated/deleted`, `comment_created`, `member_invited/removed`) go only to that room — no global broadcast. Removed users can't keep listening; re-join re-verifies. Personal events (`assigned_task_updated`) use a separate per-user registry.
- Reconnects: `hooks/useSocket.js` backs off 1s→15s cap; all real state is REST-fetched on load, so a dropped socket self-heals (header pill shows status).
- Single-process in-memory manager (`backend/app/ws/manager.py`, `default=str` JSON serialization). Horizontal scale would need Redis pub/sub — documented limit, not implemented.

## API reference (base `/api/v1`)

| Method & path | Auth | Notes |
|---|---|---|
| `POST /auth/signup` | public | 201 `{data:{user,access_token}}` + refresh cookie (logs you in) |
| `POST /auth/login` | public | 200 `{data:{user,access_token}}` + refresh cookie |
| `POST /auth/refresh` | cookie | rotates; reuse → 401 + all user sessions revoked, no new token |
| `POST /auth/logout` | cookie | revokes + clears |
| `GET /auth/me` | Bearer | current user |
| `GET /projects?page&per_page` | Bearer | own+member, `{data,meta,links}` |
| `POST /projects` | Bearer | 201 + `Location`; creator → owner member |
| `GET /projects/{id}` | member | project + `members[]` (hand-built, not ORM auto-serialize) + `task_counts` |
| `PATCH /projects/{id}` | owner | name/description |
| `DELETE /projects/{id}` | owner | 204 cascade |
| `POST /projects/{id}/members {email,role}` | owner | 201, WS `member_invited` |
| `DELETE /projects/{id}/members/{uid}` | owner | can't remove owner; unassigns tasks; WS `member_removed` |
| `GET /projects/{id}/activity` | member | paginated desc |
| `GET /projects/{id}/tasks?status&priority&assignee_id&search&page&per_page&sort&order` | member | paginated |
| `POST /projects/{id}/tasks` | member | due_date ≥ today, assignee must be member → 422 otherwise |
| `GET/PATCH /projects/{id}/tasks/{tid}` | member | **only assignee or owner can set Done** (403 else); `completed_at` auto set/cleared |
| `DELETE /projects/{id}/tasks/{tid}` | owner/creator | 204 |
| `GET/POST /projects/{id}/tasks/{tid}/comments` | member | content 1–2000 |
| `GET /dashboard` | Bearer | assigned counts by status, overdue, per-project counts, recent activity(10) |
| `GET /assigned?status&page…` | Bearer | tasks assigned to me across projects |
| `GET /health`, `GET /ready` | public | liveness + DB check |

Errors: `{error:{code,message,details}, request_id}`. Lists: `{data,meta:{total,page,per_page,total_pages},links:{self,next,last}}`.

## Tests & verification

- Backend: `cd backend && pytest` — **20 passed** (signup/login/me, password rules + name max 100, refresh rotation + reuse→all-sessions-revoked, expired-access 401→refresh→retry, non-member 403 sweep across project/task/comment/activity endpoints, member task-management vs membership-denial, remove-member preserves tasks, project-delete cascade with zero orphans, combined task filters + literal search + priority sorting + server-side pagination, task validation edges + Done/completed_at symmetry + removed-assignee block, cross-user assignment/comments/Done-rule proof, logout, SQLite naive-datetime, invite/permissions, Done rule + `completed_at`, due/assignee 422s, delete rule, pagination/filters/search, comments, health/ready, envelope shape).
- Frontend: `cd frontend && npm test` — **3 passed** (`node --test`, zero deps): expired token → automatic refresh → retry succeeds with exactly one `/refresh`; three concurrent 401s share one in-flight refresh; dead refresh → 401 with token cleared and no loop. `npm run build` clean.
- Frontend: `cd frontend && npm run build` — clean (routes `/`, `/login`, `/signup`, `/dashboard`, `/assigned`, `/projects/[id]`).
- Repo checks: `docker compose config` valid; no placeholder image URLs; no emojis (SVG icons); no hardcoded API URLs (env only); no `localStorage` tokens; CI in `.github/workflows/ci.yml` runs both suites.
- Live WS verified: authenticated connect, non-member join rejected, task/comment broadcasts room-scoped, personal assigned push.

## Known limits / next steps

- Alembic migration `0001_initial.py` ships; dev fallback `create_all` remains for SQLite/tests — production should run `alembic upgrade head` (compose does).
- WS manager is in-process; multi-replica needs Redis pub/sub.
- No account lockout on repeated failed logins (rate limit only); no list virtualization for 1000s of tasks; no optimistic drag-drop rollback (server is source of truth, refetch on WS event).

## AI usage disclosure

Built with AI assistance (subagents for backend/frontend scaffolding) under human direction using the 4 skill packs above. Every stateful flow (signup→login→refresh rotation→reuse rejection, invite→permission 403s, Done rule, WS join→scoped broadcast) was verified by running real HTTP + WS clients against the app — which caught and fixed: Pydantic v2 raw-`ValueError` in 422 details (now sanitized), WS `datetime` JSON crash (now `default=str`), and `psycopg2-binary`/Python-3.14 wheel gap (SQLite path for local dev, pinned `sqlalchemy 2.0.54`).

## Demo checklist (for recording)

Two windows (Alice owner, Bob member) → create project → invite Bob → create + assign task → drag To Do→In Progress→Done (note: Bob can only Done his own) → comment → watch other window update live → dashboard + activity feed → hard-refresh (silent refresh keeps session) → logout.
