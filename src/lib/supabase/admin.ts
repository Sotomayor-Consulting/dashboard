// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';
// importa tu tipo Database si lo usas, ej: import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!;

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
