# Session 20 — Dashboard shows charts block

Commit: `Show charts block on dashboard`

## Changes
- `frontend/pages/dashboard.js` — renders `EfferdCharts` with live counts;
  REMOVED in this pass: project cards list, create/delete project flows,
  activity feed, loading/error/empty states, live pill. Dashboard no longer
  manages projects — use Assigned/board pages or revert this commit.
- `frontend/pages/assigned.js`, `projects/[id].js` — content area switches
  to `efferd-dark-main` variant (1 line each, visual only)
- `docs/commits/README.md` — index extended

## Warnings (review findings, committed as-is per explicit direction)
- This is a functional regression vs the previous dashboard: project
  management entry points on this page are gone. Restore via
  `git revert <this-commit>` if the charts-first direction is abandoned.

## Verify
- `/dashboard`, `/`, `/assigned` 200; dev log clean
