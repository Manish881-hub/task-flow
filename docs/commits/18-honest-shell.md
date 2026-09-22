# Session 18 — Honest Efferd shell

Commit: `Rebuild app shell with real data`

## Changes
- `frontend/components/dashboard/EfferdSidebar.js` (new) — dark rail rebuilt
  from scratch: brand, ⌘K search (reuses SearchPalette), Dashboard /
  Assigned (live open-count badge) / projects quick list (active highlight,
  create shortcut), account menu, collapse. Only destinations that exist —
  no dead Calendar/Campaigns/Team tabs.
- `frontend/components/dashboard/DashboardStats.js` (new) — metric cards
  computed from the loaded projects + assigned lists (counts + status bar);
  no sampled numbers, no fake deltas, no AI modal.
- `frontend/styles/efferd-dashboard.css` (new) — scoped `.efferd-*` shell,
  stats, and responsive rules (rail becomes a top strip under 1024px, CSS
  only). No global resets.
- `frontend/pages/dashboard.js`, `assigned.js`, `projects/[id].js` —
  Navbar shell swapped for the rail layout; all data logic untouched;
  dashboard gains stats strip + keeps live pill; board keeps its own.
- `frontend/pages/_app.js` — imports the shell stylesheet.

## Why
The removed suite showed hardcoded e-commerce metrics, a canned-alert "AI"
button, and navigation to nowhere. This rebuild keeps the dark-rail look but
every pixel is backed by API data. Deliberately not resurrected: fake
charts, AI modal, dead tabs, `onOpenProject` dead prop.

## Verify
- `/dashboard`, `/assigned` 200, dev log clean; class cross-check
  (every `efferd-*` hook defined); activity feeds now show real names
