# Navon site — engineering conventions

Static marketing site built with **Astro 5**. Production: `navon.africa`
(Cloudflare Pages). The rules below exist so every page, image, and video added
later stays fast and consistent. **Read the "Media" section before adding any
image or video — it is the part most easily done wrong.**

## Commands

```bash
npm run dev      # local dev on :4321
npm run build    # production build -> dist/ (this is where images get optimized)
npm run preview  # serve the built site on :4322
npm run check    # astro check (type pass; see "Known noise" below)
```

## Architecture

- `output: 'static'`, `format: 'file'` (URLs are `foo.html`, not `foo/index.html`),
  `trailingSlash: 'never'`. Keep internal links in that shape (`docs.html`, not `/docs/`).
- `site` / `base` come from `ASTRO_SITE` / `ASTRO_BASE` env vars in CI; defaults
  live in `astro.config.mjs`.
- **Pages** → `src/pages/*.astro`. **Reusable UI** → `src/components/*.astro`.
  **Layouts** → `src/layouts/` (`Site.astro` wraps every page: Nav + slot + Footer).
- **Page-specific CSS** → `src/styles/<page>.css`, imported at the top of the page
  (`import '../styles/x.css'`). This gets **bundled, minified, and fingerprinted**
  by Astro — the preferred path for new styles.
- **Global CSS/JS** → `public/assets/shared.css` + `shared.js`. These are linked
  manually in `BaseHead.astro` / `Site.astro` and are **NOT** bundled (kept this
  way on purpose — page CSS deliberately overrides shared.css by cascade order
  across ~20 pages, and bundling would reorder the cascade). Because the URLs are
  stable and non-fingerprinted, **bump the `?v=N` query string** on the
  `shared.css` / `shared.js` links whenever you edit them, or browsers serve a
  stale cached copy.
- **Single source of truth for data** → `src/data/*.js` (e.g. `partners.js`).

## Media — the important part

### The `public/` vs `src/assets/` rule

This decides whether an asset gets optimized:

- **`src/assets/…` → goes through the build pipeline.** Imported, then rendered
  with `<Image>`/`<Picture>`. Astro emits responsive **WebP**, fingerprints the
  filename, and infers dimensions. **This is the default for any raster image.**
- **`public/…` → copied verbatim, NOT optimized.** Stable, non-fingerprinted URL.
  Use it only for things that must keep a fixed URL or that Astro can't process:
  videos, favicons, `og-image.png`, `shared.css`/`shared.js`, pre-encoded posters.

> Putting a JPEG/PNG in `public/` and pointing a raw `<img>` at it ships the full
> unoptimized file. Don't — unless it's a deliberate exception above.

### Images → `<Image>` from `astro:assets`

```astro
---
import { Image } from 'astro:assets';
import photo from '../assets/<folder>/<file>.jpg';
const photoWidths = [640, 1024, 1600];   // reuse this for full-bleed photos
---
<Image
  src={photo}
  alt="Concrete, specific description"
  widths={photoWidths}
  sizes="100vw"            /* see sizes table below */
  loading="lazy"           /* eager only for above-the-fold/LCP images */
/>
```

Pick `sizes` to match how wide the image actually renders, so the browser
downloads the smallest sufficient variant:

| Layout                        | `sizes`                                  |
|-------------------------------|------------------------------------------|
| Full-bleed band               | `100vw`                                   |
| Two-up pair / side-by-side    | `(max-width: 760px) 100vw, 50vw`          |
| Four-up mosaic / quarter grid | `(max-width: 760px) 50vw, 25vw`           |

- The **first image in the viewport** (a hero/LCP image) should use
  `loading="eager"` and add `fetchpriority="high"`. Everything below the fold
  stays `loading="lazy"`.
- Always write a real `alt`. Decorative-only images: `alt="" aria-hidden="true"`.
- A worked example with all three layout profiles lives in
  `src/pages/hells-gate.astro`.

### Dynamic / data-driven images (galleries, partner headshots)

`<Image>` needs a static import, so a runtime string like `{p.portrait}` won't be
optimized. When real partner/team headshots arrive, **import the whole folder**
and look the image up by key rather than pointing `<img>` at `public/`:

```astro
---
import { Image } from 'astro:assets';
// eager: true so the modules resolve at build time
const headshots = import.meta.glob('../assets/partners/*.{jpg,png}', {
  eager: true, import: 'default',
});
// data holds a key like 'delta'; resolve to the imported asset
const img = headshots[`../assets/partners/${p.slug}.jpg`];
---
{img && <Image src={img} alt={p.name} width={480} height={480} loading="lazy" />}
```

Until then `portrait: null` renders a designed monogram tile — that's intended.

### Videos → `public/assets/video/` + `VideoFeature.astro`

Astro does **not** transcode video, so videos live in `public/`. Use the
`VideoFeature` component — never a bare `<video>`:

```astro
<VideoFeature
  title="…"
  description="…"
  src="/assets/video/<name>.mp4"
  poster="/assets/video/<name>-poster.webp"   /* ALWAYS pass a poster */
  align="left"
/>
```

- **Always pass a `poster`.** Without one the frame is a black box until the
  video loads. The component uses `preload="none"`, so the video bytes are only
  fetched when it scrolls into view (it autoplays muted via `shared.js`) — the
  poster is what the user sees until then.
- **Export settings for new clips:** H.264 MP4, 720×1280 portrait (these are
  phone-shot vertical clips), ~600–800 kbps, 25 fps. That keeps a ~40s clip
  around 4 MB. Don't ship 1080p — the frame renders at ~330px wide.

#### Generating a poster (this build's ffmpeg lacks libwebp, so use sharp)

```bash
# 1. extract a representative frame (~25% in, capped at 3s) as PNG
ffmpeg -y -ss 3 -i public/assets/video/<name>.mp4 -frames:v 1 /tmp/<name>.png
# 2. convert to optimized WebP with sharp (already installed for astro:assets)
node -e "require('sharp')('/tmp/<name>.png').webp({quality:72,effort:6})\
  .toFile('public/assets/video/<name>-poster.webp')"
```

Target ~25–35 KB per poster.

## Tonal rhythm (standing design rule)

Alternate dark and light section bands down every page — never a continuous slab
of black (it reads "AI-generated"). Use the `.section--light` utility for light
bands; whole light-theme pages use `body.theme-light`. Watch for hardcoded-color
SVGs and dark cards that break the alternation.

## Brand

- Palette (CSS custom props): `--ink #0b0b07`, `--charcoal #3F4157`,
  `--signal #E7FF00` (neon yellow accent), `--paper #FFFFFF`, `--vlight #F3F4F4`.
- Fonts: **Space Grotesk** (display), **JetBrains Mono** (mono/labels).
- Logos are theme-aware: off-white wordmark on dark, black wordmark on light
  (toggled by `body.theme-light` / `.section--light`). See `Nav.astro` /
  `Footer.astro` — wordmarks are `<Image>` imports from `src/assets/`.
- Social share image: `public/assets/og-image.png` (1200×630, branded on black).
  OG/Twitter meta with absolute URLs lives in `BaseHead.astro`.

## Known noise

`astro check` reports ~500 errors that are **type-checker noise, not build
failures** — inline `onerror`/`onclick` handler strings and `.find()`
possibly-undefined patterns. `npm run build` is the source of truth; it passes.
Don't chase the check errors unless deliberately doing a typing cleanup.
