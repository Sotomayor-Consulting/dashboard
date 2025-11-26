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

    // TUS CONFIGURACIONES CORREGIDAS:
    // 1. `site`: Establecido como variable de entorno o URL por defecto para producción.
    // 2. `base`: **Eliminado para producción** (deja el valor por defecto: '/').
    site: process.env.PUBLIC_SITE_URL || 'https://dashboard-sotomayor-consulting.netlify.app/', // Puedes reemplazar por tu dominio
    base: '/', // Asegura que la raíz sea '/'

    server: {
        port: DEV_PORT,
    },

    // Tus integraciones se mantienen:
    integrations: [
        sitemap(),
        tailwind(),
    ],
});