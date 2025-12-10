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
  site: 'https://dashboard.sotomayorconsulting.com',
  base: '/',
  integrations: [sitemap(), tailwind(), icon()],
});
