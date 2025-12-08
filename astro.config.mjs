import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import icon from 'astro-icon';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  integrations: [sitemap(), tailwind(), icon()],
});
