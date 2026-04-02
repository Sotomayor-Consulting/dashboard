import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import icon from 'astro-icon';

import react from '@astrojs/react';

export default defineConfig({
	site: 'https://app.sotomayorconsulting.com',
	prefetch: {
		defaultStrategy: 'hover',
	},
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	vite: {
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				external: ['puppeteer', 'carbone'],
			},
		},
	},
	base: '/',
	integrations: [sitemap(), icon(), react()],
	image: {
		remotePatterns: [{ protocol: 'https' }],
	},
});
