# Session 20 — Sidebar status wiring

Commit: `Wire sidebar status on all pages`

## Changes
- `frontend/pages/dashboard.js`, `assigned.js`, `projects/[id].js` —
  pass live `socketStatus` into the rail status card (board keeps its own
  badge; dashboard keeps its header pill)

## Why
The status card needs the socket state it displays; previously only the
sidebar's own fetch/palette were live.

## Verify
- `/dashboard`, `/assigned` 200 once dev cache cleaned (recurring
  concurrent-build corruption — see session 14 guard notes)
