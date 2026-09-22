# Session 08 — Frontend API contract

Commit: `Fix frontend API contract`

## Changes
- `frontend/lib/api.js` — central `unwrapEnvelope()`: backend `{data}` envelopes
  are unwrapped to inner values (lists keep `meta`/`links`); refresh token read
  fixed the same way. Previously every extractor read flat fields and got
  `undefined`, so no session was ever established in the browser.
- `frontend/pages/dashboard.js`, `assigned.js` — `/api/v1/tasks/assigned`
  (404, never existed) → `/api/v1/assigned`; dashboard activity `?limit=5` →
  `?per_page=5`
- `frontend/pages/projects/[id].js` — drag-drop move to nested
  `/projects/{id}/tasks/{tid}`; `?limit=` → `?per_page=` within backend cap
  (`per_page=200` exceeded `le=100` and 422'd the whole board → capped at 100);
  backlog search input gained `id="backlog-search"`
- `frontend/components/TaskModal.js` — edit/delete/comments to nested
  `/projects/{id}/tasks/{tid}[/comments]` routes (old flat routes 404'd)
- `frontend/components/InviteModal.js` — `.../invite` → `.../members`
- `frontend/pages/_document.js` (new) + `_app.js` — font `<link>` moved out of
  `next/head` into Document (fixes Next.js no-stylesheets-in-head warning)

## Why
Browser signup/login could never establish a session and every board mutation
hit 404, while curl/pytest stayed green — the frontend spoke a different
contract than the committed `{data}` envelope API. All verified live after fix.

## Verify
- `npm run build` clean; full curl flow green (session→project→task→move→
  comment→invite→refresh rotation→reuse-reject)
