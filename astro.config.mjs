import { defineConfig, envField } from 'astro/config';
import { createLogger } from 'vite';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import icon from 'astro-icon';

import react from '@astrojs/react';

const logger = createLogger();
const originalInfo = logger.info;
const originalWarn = logger.warn;

logger.info = (msg, options) => {
	if (msg.includes('[optimizer]')) return;
	if (msg.includes('new dependencies optimized')) return;
	if (msg.includes('optimized dependencies changed')) return;
	originalInfo(msg, options);
};

logger.warn = (msg, options) => {
	if (msg.includes('vite:css') && msg.includes('is empty')) return;
	originalWarn(msg, options);
};

export default defineConfig({
	env: {
		schema: {
			PUBLIC_TURNSTILE_SITE_KEY: envField.string({
				context: 'client',
				access: 'public',
				optional: true,
			}),
			TURNSTILE_SECRET_KEY: envField.string({
				context: 'server',
				access: 'secret',
				optional: true,
			}),
		},
	},
	site: 'https://app.sotomayorconsulting.com',
	security: {
		checkOrigin: true,
		allowedDomains: [
			{
				hostname: 'app.sotomayorconsulting.com',
				protocol: 'https',
			},
			{
				hostname: 'localhost',
				protocol: 'http',
			},
			{
				hostname: '127.0.0.1',
				protocol: 'http',
			},
		],
	},
	prefetch: {
		defaultStrategy: 'hover',
	},
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	vite: {
		customLogger: logger,
		server: {
			allowedHosts: ['.trycloudflare.com'],
		},
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['astro/virtual-modules/prefetch.js'],
		},
		build: {
			rollupOptions: {
				external: ['puppeteer', 'carbone'],
			},
		},
	},
	base: '/',
	integrations: [
		sitemap(),
		icon({
			iconDir: 'src/assets/illustrations',
		}),
		react(),
	],
	image: {
		remotePatterns: [{ protocol: 'https' }],
	},
});
