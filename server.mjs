// Forzamos HOST/PORT ANTES de cargar Astro
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '4321'; // 👈 puerto interno por defecto

import('./dist/server/entry.mjs').catch((err) => {
	console.error('Error starting Astro server:', err);
	process.exit(1);
});
