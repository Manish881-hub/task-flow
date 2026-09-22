# Session 04 — Next.js frontend

Commit: `Add Next.js frontend`

## Changes
- `frontend/lib/api.js` — env base URL, in-memory token (never localStorage),
  transparent 401 → refresh → retry, `ApiError` + human error messages
- `frontend/lib/auth.js` — AuthContext, login/signup/logout, silent refresh on start
- `frontend/hooks/useSocket.js` — `/ws?token=` join, capped backoff 1s→15s,
  Live/Reconnecting status
- `frontend/components/` — Navbar, RequireAuth, TaskCard, TaskModal (+comments),
  InviteModal, ActivityFeed, EmptyState, Skeleton, ErrorBanner
- `frontend/pages/` — landing, login, signup, dashboard, assigned, projects/[id]
  (drag-drop board, backlog search/filter/sort/pagination, members, live feed)
- `frontend/styles/globals.css` — Flat-Design tokens (green/gold), Plus Jakarta
  Sans, responsive, focus rings, reduced-motion
- `frontend/package.json`, `package-lock.json`, `next.config.js`,
  `.env.example`, `.gitignore`

## Why
Full client for the board: auth flow, dashboard, assigned-to-me, and the live
project board with backlog, members, comments, and activity — all states handled
(loading skeleton, empty, error).

## Skills applied
- UI-UX-Pro-Max: Flat Design system (no gradients/shadows, 1 accent, WCAG AAA,
  150–200ms hovers, 375/768/1024/1440)
- miniMAX frontend-dev: no Inter, no emojis (SVG only), `min-h-[100dvh]`,
  no placeholder URLs, tactile feedback, GPU-only motion

## Verify
- `npm run build` — clean, 6 routes
- Grep: no unsplash/placeholder URLs, no emojis, no hardcoded API URLs
