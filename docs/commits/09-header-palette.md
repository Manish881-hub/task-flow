# Session 09 — Header and search palette

Commit: `Rebuild header and add search palette`

## Changes
- `frontend/components/Navbar.js` — OpenRouter-inspired header rebuilt for
  TaskFlow: brand lockup button, ⌘K search trigger, pill links + live pill,
  account dropdown (Dashboard / Assigned / Log out, Escape + outside-click),
  hamburger mobile panel under 1024px. No Tailwind, no external images.
- `frontend/components/SearchPalette.js` (new) — global command palette over
  live projects + assigned tasks: debounced-free client filter, ↑↓/Enter/Esc,
  combobox/listbox ARIA, scroll-lock, loading/empty/error states.

## Why
Header actions now drive real app state (previously the search trigger had no
target and auth-area links assumed a session shape that never existed). Palette
queries the same verified list endpoints (`per_page=100`, within backend caps).

## Verify
- Dev compiles clean, `/` + `/dashboard` 200; palette endpoints 200 live
