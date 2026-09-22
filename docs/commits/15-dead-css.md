# Session 15 — Dead CSS removal

Commit: `Remove dead CSS`

## Changes
- `frontend/styles/globals.css` — removed `brand-mark` (logo is an image now),
  `grid-4`, `table-wrap`, and the orphaned pre-landing hero block (`.hero`,
  `.hero-card`, `.lead`, `.check-list`, `.check`)
- `frontend/styles/landing.css` — removed `.tuf-logo-icon` (superseded by
  `.tuf-logo-img`) and 5 `.tuf-syntax-*` highlight rules (code renders plain)
- `frontend/components/landing/HeroSection.js` — dropped dangling
  `tuf-hero-left` hook (never had a style rule; zero-render-change)

## Why
Every removal verified by a usage audit script (117 + 112 selectors checked
against all JS): zero references. Two `palette-kind-*` flags were false
positives (dynamic template construction) and were kept.

## Verify
- Audit re-run: 0 unused selectors; pages 200, dev log clean
