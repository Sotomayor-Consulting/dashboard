import { defineConfig, envField } from 'astro/config';
import { createLogger } from 'vite';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import icon from 'astro-icon';

import react from '@astrojs/react';

import sentry from '@sentry/astro';

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
	server: {
		host: true,
	},
	vite: {
		customLogger: logger,
		server: {
			allowedHosts: ['.trycloudflare.com', 'dev.sotomayorconsulting.com'],
		},
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['astro/virtual-modules/prefetch.js', '@base-ui/react'],
			// @base-ui/react está excluido, pero su dependencia CJS necesita
			// la conversión a ESM de Vite o la hidratación de islands falla.
			include: [
				'use-sync-external-store/shim',
				'use-sync-external-store/shim/with-selector',
			],
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
		sentry({
			project: 'javascript-astro',
			org: 'sotomayor-consulting-international',
			authToken: process.env.SENTRY_AUTH_TOKEN,
		}),
	],
	image: {
		remotePatterns: [{ protocol: 'https' }],
	},
});
