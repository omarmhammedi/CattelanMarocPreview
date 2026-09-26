import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';
import { cataloguePlugin } from './src/plugins/catalogue/index.ts';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ inspectorPort: false }),
  // EmDash API endpoints use extensionless paths; do not redirect POST requests.
  trailingSlash: 'ignore',
  vite: {
    server: {
      allowedHosts: process.env.CODESPACE_NAME
        ? [`${process.env.CODESPACE_NAME}-4321.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`]
        : [],
    },
  },
  integrations: [
    react(),
    emdash({
      database: d1({ binding: 'DB', session: 'disabled' }),
      storage: r2({ binding: 'MEDIA' }),
      plugins: [cataloguePlugin()],
    }),
  ],
  devToolbar: { enabled: false },
});
