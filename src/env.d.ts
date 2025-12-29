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
