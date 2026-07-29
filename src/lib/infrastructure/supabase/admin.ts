// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
	process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY =
	process.env.SUPABASE_SECRET_KEY ?? import.meta.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
	throw new Error(
		'Missing Supabase admin environment variables: PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.',
	);
}

export const supabaseAdmin = createClient(
	SUPABASE_URL,
	SUPABASE_SECRET_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);
