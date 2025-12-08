import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

import icon from 'astro-icon';

const DEV_PORT = 2121;

// https://astro.build/config
export default defineConfig({
    // La clave para SSR
    output: 'server', 
    
    // **El adaptador
    adapter: node({
    mode: 'standalone'
  }),

    base: '/', 

    server: {
        port: DEV_PORT,
    },

    // Tus integraciones se mantienen:
    integrations: [sitemap(), tailwind(), icon()], 
});