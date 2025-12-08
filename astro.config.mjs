import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import icon from 'astro-icon';

const PORT = Number(process.env.PORT) || 3000;

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  base: '/',
  server: {
    port: PORT,
    host: '0.0.0.0',
  },
  integrations: [sitemap(), tailwind(), icon()],
});