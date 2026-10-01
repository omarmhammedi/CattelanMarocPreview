import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';
import { cataloguePlugin } from './src/plugins/catalogue/index.ts';
import { requestsPlugin } from './src/plugins/requests/index.ts';
import { siteSeoPlugin } from './src/plugins/seo/index.ts';
import { resendEmailPlugin } from './src/plugins/email/index.ts';

export default defineConfig({
  output: 'server',
  i18n: { defaultLocale: 'fr', locales: ['fr'] },
  adapter: cloudflare({ inspectorPort: false }),
  // EmDash API endpoints use extensionless paths; do not redirect POST requests.
  trailingSlash: 'ignore',
  vite: {
    define: {
      'import.meta.env.CATTELAN_EMAIL_ENABLED': JSON.stringify(process.env.CLOUDFLARE_ENV === 'cattelan-client'),
      'import.meta.env.CATTELAN_EDITOR_ORIGIN': JSON.stringify(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(process.env.CODESPACE_NAME || '')
          ? `https://${process.env.CODESPACE_NAME}.github.dev`
          : '',
      ),
    },
    server: {
      // The private preview and auth origin use one fixed forwarded port.
      // Fail clearly on a collision instead of silently starting on 4322.
      strictPort: true,
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
      plugins: [cataloguePlugin(), requestsPlugin(), siteSeoPlugin(),
        ...(process.env.CLOUDFLARE_ENV === 'cattelan-client' ? [resendEmailPlugin()] : []),
      ],
    }),
  ],
  devToolbar: { enabled: false },
});
