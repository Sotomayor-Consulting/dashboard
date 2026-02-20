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
// Usamos import() inline para NO convertir este archivo en un módulo.
// Un top-level import/export convierte el .d.ts en módulo y aísla el namespace.
declare namespace App {
	interface Locals {
		/** Usuario autenticado actual, null si no está logueado */
		user: import('./lib/auth/auth.types').AuthUser | null;
		/** Roles del usuario desde la tabla user_roles → roles */
		userRoles: import('./lib/roles').RoleName[];
	}
}
