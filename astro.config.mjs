import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import icon from 'astro-icon';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  base: '/',
  integrations: [sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
