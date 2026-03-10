import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import icon from 'astro-icon';

export default defineConfig({
	prefetch: {
		defaultStrategy: 'hover',
	},
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	vite: {
		plugins: [tailwindcss()],
	},
	base: '/',
	integrations: [sitemap(), icon()],
	image: {
		remotePatterns: [{ protocol: 'https' }],
	},
});
