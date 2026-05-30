import { defineConfig } from 'astro/config';

// ASTRO_SITE / ASTRO_BASE are set by the GitHub Actions deploy workflow.
// Locally and on navonworld.com these env vars are absent → production defaults apply.
export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'https://navonworld.com',
  base: process.env.ASTRO_BASE ?? '/',
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Match the existing site's URL shape (foo.html, not foo/index.html)
    format: 'file',
  },
});
