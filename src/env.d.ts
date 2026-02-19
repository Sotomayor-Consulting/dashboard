/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// ─── Environment Variables ──────────────────────────────
interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_ANON_KEY: string;

	// Stripe (solo backend)
	readonly STRIPE_SECRET_KEY: string;

	// Stripe (frontend + backend)
	readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// ─── Astro Locals (disponible via Astro.locals / context.locals) ─
// Nota: Usamos import() inline para no convertir este archivo en un módulo.
declare namespace App {
	interface Locals {
		/** Usuario autenticado actual, null si no está logueado */
		user: import('./lib/auth/auth.types').AuthUser | null;
	}
}
