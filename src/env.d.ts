/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// ─── Environment Variables ──────────────────────────────
interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_ANON_KEY: string;
	readonly SUPABASE_SERVICE_ROLE_KEY: string;
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
		supabase: import('@supabase/supabase-js').SupabaseClient;
	}
}

// Permite que `tsc --noEmit` (sin el language server de Astro) resuelva
// imports de componentes .astro desde archivos .ts (e.g. stage registries).
declare module '*.astro' {
	const component: (props: Record<string, unknown>) => unknown;
	export default component;
}

declare module '*.svg' {
	const src: string;
	export default src;
}

// Allow non-standard SVG namespaces (Inkscape/Sodipodi/xlink/data:*) used in inline SVGs
declare namespace astroHTML.JSX {
	interface SVGAttributes {
		'inkscape:label'?: string;
		'inkscape:collect'?: string;
		'inkscape:version'?: string;
		'inkscape:groupmode'?: string;
		'sodipodi:docname'?: string;
		'sodipodi:nodetypes'?: string;
		'xmlns:inkscape'?: string;
		'xmlns:sodipodi'?: string;
		'xmlns:svg'?: string;
		'xmlns:xlink'?: string;
		'xlink:href'?: string;
		'data:realIndex'?: string;
	}
}
