/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// ─── Environment Variables ──────────────────────────────
interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_ANON_KEY: string;
	readonly STRIPE_SECRET_KEY: string;
	readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		user: import('@supabase/supabase-js').User | null;
		userRoles: string[];
	}
}
