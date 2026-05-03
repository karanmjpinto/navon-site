# Navon site (Astro)

The Navon marketing site. All 17 pages are `.astro` files sharing one `<Nav>`, one `<Footer>`, one `<BaseHead>`, and one `Site.astro` layout. The previous hand-written `.html` files have been removed; this is the source of truth.

The customer portal app lives in [`portal/`](portal/) — that's a separate Next.js project, unrelated to this site build.

## Run it

```bash
pnpm install        # ~30s
pnpm dev            # → http://localhost:4321
pnpm build          # → dist/ (17 plain .html files, ready to deploy)
pnpm preview        # → http://localhost:4322 serves dist/
```

## Pages

| URL | Source | Notes |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | Home |
| `/customer-portal` | `src/pages/customer-portal.astro` | Feature overview, animated |
| `/about` | `src/pages/about.astro` | |
| `/cloud` | `src/pages/cloud.astro` | Sovereign cloud / committed capacity |
| `/products` | `src/pages/products.astro` | Largest page (~2700 lines) |
| `/missions` | `src/pages/missions.astro` | |
| `/hells-gate` | `src/pages/hells-gate.astro` | Flagship site detail |
| `/foundations` | `src/pages/foundations.astro` | |
| `/inside` | `src/pages/inside.astro` | Team |
| `/insights` | `src/pages/insights.astro` | + filter pills |
| `/news` | `src/pages/news.astro` | |
| `/faq` | `src/pages/faq.astro` | + tab + accordion |
| `/docs` | `src/pages/docs.astro` | + sidebar |
| `/resources` | `src/pages/resources.astro` | |
| `/legal/privacy-policy` | `src/pages/legal/privacy-policy.astro` | |
| `/legal/terms-of-service` | `src/pages/legal/terms-of-service.astro` | |
| `/legal/cookie-preferences` | `src/pages/legal/cookie-preferences.astro` | + toggle save |

Both `/about` and `/about.html` work — the build emits `dist/about.html` so existing inbound links to `.html` URLs keep resolving.

## Repo shape

```
/  (worktree root — this is the Astro site)
├── public/assets/
│   ├── shared.css         ← global design system (copied from previous /assets/)
│   ├── shared.js          ← scroll reveal, mega-menu, cookie banner, segmented switcher
│   ├── hells-gate/        ← site photography
│   └── team/              ← team portraits
├── src/
│   ├── components/
│   │   ├── Nav.astro      ← the ~40-line nav, ONCE (was duplicated × 17)
│   │   ├── Footer.astro   ← footer + legal strip, ONCE
│   │   ├── BaseHead.astro ← <meta>, fonts, shared.css link
│   │   └── Eyebrow.astro
│   ├── layouts/
│   │   └── Site.astro     ← head + nav + slot + footer + shared.js
│   ├── pages/
│   │   ├── index.astro
│   │   ├── customer-portal.astro
│   │   ├── about.astro · cloud.astro · docs.astro · faq.astro · foundations.astro
│   │   ├── hells-gate.astro · inside.astro · insights.astro · missions.astro
│   │   ├── news.astro · products.astro · resources.astro
│   │   └── legal/
│   │       ├── privacy-policy.astro
│   │       ├── terms-of-service.astro
│   │       └── cookie-preferences.astro
│   └── styles/
│       └── <page>.css     ← page-specific styles, separated per page
└── README.md
```

## What changed vs the existing HTML site

| | Before | After |
| --- | --- | --- |
| Nav block | duplicated × 17 (~480 lines copy-paste) | 1 component (~40 lines) |
| Footer block | duplicated × 17 (~80 lines) | 1 component (~45 lines) |
| `<head>` boilerplate | duplicated × 17 (~190 lines) | 1 component (~17 lines) |
| Adding a nav link | 17 file edits | 1 line in `Nav.astro` |
| Page-specific CSS | inline `<style>` in every `.html` | extracted to `src/styles/<page>.css` |
| Page-specific JS | inline `<script>` after shared.js | `<script is:inline>` at end of `.astro` |
| `assets/shared.css`, `shared.js` | unchanged | unchanged (copied verbatim into `public/assets/`) |
| Animations / interactions | works | works (same shared.js drives them) |

## Page-specific scripts

Five pages have their own bottom `<script>` (filter pills, tab switching, accordion, sidebar nav, cookie toggles). They're embedded as `<script is:inline>` at the end of each `.astro` file, so Astro doesn't bundle them — they run verbatim, identical to today.

- `/insights` — category filter
- `/faq` — tab switching + accordion
- `/docs` — sidebar active link
- `/about` — interactive sections
- `/legal/cookie-preferences` — toggle save

## Style-tag-only pages

Two legal pages (`privacy-policy`, `terms-of-service`) had no inline `<style>` — they use only `shared.css`. Those `.astro` files have no CSS import, just the `<Site>` wrapper and body content.

## Body class

Pages that originally had `<body class="theme-light">` (docs, missions, products, all 3 legal pages) pass `bodyClass="theme-light"` to `<Site>`.

## Build output

`pnpm build` produces 17 plain `.html` files in `dist/`. Total size: ~700 KB including bundled CSS. Servable from any static host (Cloudflare Pages, Netlify, S3, or alongside the portal on the GPU box behind Caddy).

## What's left

- **Hosting** — pick a host. Cloudflare Pages or Netlify are zero-config (point at the repo, build command `pnpm build`, output dir `dist`). Or self-host on the GPU box behind Caddy alongside the portal: set `serve dist` in the Caddyfile for the apex domain.
- **DNS** — `navonworld.com` (apex) → static host or GPU box. `portal.navonworld.com` → portal (covered separately).

## Try the one-line edit

Open [`src/components/Nav.astro`](src/components/Nav.astro) and change anything in the nav. Save. **All 17 pages** pick up the change instantly. That's the win.
