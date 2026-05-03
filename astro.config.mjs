import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://navonworld.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Match the existing site's URL shape (foo.html, not foo/index.html)
    format: 'file',
  },
});
