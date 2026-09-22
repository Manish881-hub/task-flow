# Session 13 — TaskFlow landing

Commit: `Add TaskFlow landing`

## Changes
- `frontend/components/landing/` (7 files: Navbar, Hero, Features,
  Testimonials, FAQ, CTA banner, Footer) — page-section UI built by the
  companion (Antigravity) agent: responsive grid, tabs, accordion, code-card
  with copy button, metrics mockup with SVG chart, mobile drawer
- `frontend/styles/landing.css` — isolated landing stylesheet (own theme,
  app `globals.css` untouched by it)
- `frontend/public/logo.png` — white TF monogram on black (product brand mark);
  wired as app navbar logo, landing navbar/footer logos, and favicon
- `frontend/pages/404.js`, `_error.js` — brand-neutral error pages on the
  landing shell
- `frontend/pages/_app.js` — imports `landing.css`
- `frontend/pages/_document.js` — favicon link
- `frontend/components/Navbar.js` — brand tile swaps to logo image
- `frontend/pages/index.js` — assembles the landing; TaskFlow title/meta;
  logged-in users redirect to `/dashboard` (restores app flow)
- Rebrand (this session, UI untouched): TaskFlow name/copy everywhere; hero
  mockup → boards/assigned/activity metrics + throughput chart; feature tabs →
  Boards/Realtime/Teams/Workflow with real TaskFlow API snippets (C++ tab
  became cURL — a C++ snippet would have been fiction); testimonials → team
  roles (dropped false Tata/Microsoft/Google endorsements); FAQ → product
  Q&A; footer → Product/Resources/Legal + TaskFlow watermark; dead anchors
  (`#pricing`, `#all-stories`, `#live`) remapped to real targets; partner
  strip → honest Powered-By stack (Next.js/FastAPI/PostgreSQL)
- `tuf-` CSS hooks kept verbatim (invisible implementation detail)

## Why
Marketing front door for the product, telling the truth about what TaskFlow
is and does. Companion agent owns the UI build credit; review pass owned here.

## Verify
- `/`, `/login`, `/dashboard` 200; rendered HTML has zero interview-brand
  mentions; dev log clean (no build run — dev was serving; `next build`
  while dev serves corrupts `.next`, learned earlier)
