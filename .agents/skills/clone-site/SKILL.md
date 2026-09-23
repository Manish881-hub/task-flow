---
name: clone-site
description: Rebuild a website's design as a new project. Use when the user says "copy this site", "clone <url>", "make me a site like X", or gives a URL to replicate.
---

# Clone Site

Rebuild the *design system* of an existing site as original code in the user's stack. You are cloning layout, rhythm, and interaction patterns — not ripping content.

## Phase 1 — Inventory

Fetch the target URL (webfetch, markdown + html). Map into a written outline before any code:

- Every section top to bottom: nav, hero, feature blocks, social proof, FAQ, footer
- Nav items and CTAs (exact destinations)
- Scroll behaviors and animations (marquees, sticky headers, reveal-on-scroll, accordions, tab switchers)
- Responsive behavior you can infer from classes/media queries

If the site has many pages, ask which ones matter. Default: landing page only.

## Phase 2 — Extract the design system

Write down before coding, from the HTML/CSS:

- Color palette (bg, ink, accent) as CSS variables / theme tokens
- Type scale and display font pairing; heading sizes per breakpoint
- Spacing rhythm (section padding), radii, border/shadow style
- Motion vocabulary (durations, easings)

## Phase 3 — Copy stance (ask the user)

Never silently reuse text or assets. Pick one:

1. **Rebranded clone** — same structure, fresh copy for the user's brand, own SVG/CSS visuals. The default.
2. **Pixel-perfect copy** — only when the user owns or has rights to the content; still re-typeset rather than scraping images.
3. **Inspired redesign** — vibe only, different layout.

Flag it if the target's terms likely forbid cloning; let the user decide and record the choice in the project README.

## Phase 4 — Rebuild

- One component per section, composed in `App` in inventory order
- All copy, personas, FAQ entries, nav links in one `data.ts` so rebranding stays trivial
- Mockups (app screenshots on the original) become real components — never `<img>` of someone else's product shots
- Animations with CSS keyframes + IntersectionObserver reveals; no animation library unless the user already has one
- Match the user's existing stack; if none, propose Bun+Vite+React+Tailwind

## Phase 5 — Verify

- Typecheck and production build pass (`tsc -b`, `vite build` or stack equivalent)
- Run dev server; check every section against the Phase 1 outline at desktop **and** mobile widths
- Confirm zero copied assets/text from the source (grep for distinctive strings if stance was rebrand/inspired)
