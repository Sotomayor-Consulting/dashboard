import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';  // ← Nuevo adapter

import icon from 'astro-icon';

const DEV_PORT = 2121;

// https://astro.build/config
export default defineConfig({
    // La clave para SSR
    output: 'server', 
    
    // **El adaptador
    adapter: vercel(),

    site: process.env.PUBLIC_SITE_URL || 'http://localhost:2121', 
    base: '/', 

    server: {
        port: DEV_PORT,
    },

    // Tus integraciones se mantienen:
    integrations: [sitemap(), tailwind(), icon()],
});