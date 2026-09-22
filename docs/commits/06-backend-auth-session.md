# Session 06 — Backend auth and signup session

Commit: `Fix backend auth and signup session`

## Changes
- `.gitignore` — ignore root `.env.local` + `*.local` (secret-leak hardening;
  `.env.local` holds `TYPESAFE_API_KEY` + demo credentials, never committed)
- `backend/app/features/auth/router.py` — explicit `Annotated[..., Body()]` on
  signup/login bodies; removed `from __future__ import annotations`; signup sets
  refresh cookie and returns `{data:{user, access_token}}`
- `backend/app/features/auth/service.py` — `signup` issues refresh + access tokens
  (mirrors login) instead of returning the bare user
- `README.md` — signup contract updated to `{data:{user,access_token}}` + cookie

## Why
Live server with rate limiting ON returned 422 on every signup/login: slowapi's
wrapper moves type resolution into slowapi's module globals, so postponed
(string) annotations never resolved and FastAPI demoted `body` to a query param.
Tests passed only because they run with `RATE_LIMIT_ENABLED=false` (unwrapped).
Eager annotations + explicit `Body()` fix it under both configs. Signup now also
establishes a session (standard behavior the frontend relies on).

## Skills applied
- Matt code-review: root-caused via dependant introspection (`body_params: []`),
  minimal seam-level fix, verified under prod config — not just the test config
- ECC api-design: signup 201 + `Set-Cookie` + token matches login shape

## Verify
- `pytest` 10 passed; live curl: signup 201 + token + cookie, login 200,
  refresh rotation 200, reuse 401 — all with `RATE_LIMIT_ENABLED=true`
