// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
	process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error(
		'Missing Supabase admin environment variables: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
	);
}

export const supabaseAdmin = createClient(
	SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);
