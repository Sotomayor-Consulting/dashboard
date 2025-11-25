import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify'; // Importación del adaptador

const DEV_PORT = 2121;

// https://astro.build/config
export default defineConfig({
    // La clave para SSR en Netlify:
    output: 'server',
    
    // **Añadimos el adaptador de Netlify aquí:**
    adapter: netlify(),

    // Tus configuraciones de `site` y `base` se mantienen:
    site: process.env.CI
        ? 'https://themesberg.github.io'
        : `http://localhost:${DEV_PORT}`,
    base: process.env.CI ? '/flowbite-astro-admin-dashboard' : undefined,

    server: {
        port: DEV_PORT,
    },

    // Tus integraciones se mantienen:
    integrations: [
        sitemap(),
        tailwind(),
    ],
});