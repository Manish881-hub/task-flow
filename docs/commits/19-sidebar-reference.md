# Session 19 — Sidebar reference upgrade

Commit: `Upgrade sidebar to reference design`

## Changes
- `frontend/components/dashboard/EfferdSidebar.js` — reference-fidelity pass
  on our adapted rail (no Tailwind pasted): `socketStatus` prop, Live-sync
  status card in the footer, Help Center (`/#faq`) + Documentation (repo)
  links, width transition on collapse
- `frontend/styles/efferd-dashboard.css` — status card, help links, collapse
  transition (all scoped `.efferd-*`)

## Why
Match the Efferd reference structure (status footer, help links) with real
wiring instead of pasted `cn-*` markup. Dropped from the reference: fake
workspace identity, dead hash links, external avatar images.

## Verify
- Class cross-check (every new hook defined); pages 200 after dev clean
