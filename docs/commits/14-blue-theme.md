# Session 14 — Blue theme adoption

Commit: `Adopt blue theme with contrast fixes`

## Changes
- `frontend/styles/globals.css` — companion agent's blue pill-button theme
  adopted (reviewed, not authored here): royal-blue tokens, soft shadows,
  rounded pills, blue focus glow
- Contrast hardening (measured, fixed): buttons/links/nav/avatars to
  `#155ECC` (5.5–6.0); badge-green text to `#047857` (5.21, was 3.58);
  danger text to `#DC2626` (4.83, was 3.76); live-dot border to `#047857`
  (5.48); checks to success-strong
- `frontend/components/Navbar.js` — logged-out links simplified to match
  theme (kept logo-image brand lockup)
- `docs/design/color-system.md` — rewritten for blue with measured table
  (supersedes warm set per direction change)

## Why
User direction: adopt blue over warm. Review caught 4 sub-AA text pairs in
the theme as received; all fixed before committing. Flat-design rule retired
with the shadowed theme (documented above).

## Verify
- All text pairs ≥ 4.5 re-measured; `/`, `/dashboard` 200, dev log clean
- `next.config.js`: `distDir` follows `NEXT_DIST_DIR` (default `.next`) so a
  concurrent production build can no longer corrupt the dev server's `.next`
  (recurring incident: companion agent's builds kept 500ing dev; Docker/CI
  still emit to `.next`)
