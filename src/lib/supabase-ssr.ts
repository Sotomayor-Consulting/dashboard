// src/lib/supabase-ssr.ts
import {
	createServerClient,
	parseCookieHeader,
	type CookieOptionsWithName,
} from '@supabase/ssr';
import type { AstroCookies } from 'astro';
// import type { Database } from "../types/database"; // si tienes types, descomenta y pon tu tipo

// Opciones de cookies para Supabase Auth (PKCE usa esto para guardar sesión)
export const cookieOptions: CookieOptionsWithName = {
	path: '/',
	secure: true, // en local puedes poner false si te molesta, en prod true
	httpOnly: true,
	sameSite: 'lax',
	// name es opcional; si no lo pones, usa los nombres por defecto de Supabase
};

export function createSupabaseServerClient(context: {
	headers: Headers;
	cookies: AstroCookies;
}) {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
	const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;
	// Ajusta los nombres de env arriba si los tienes como PUBLIC_ o similares

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookieOptions,
		cookies: {
			getAll() {
				// leer cookies de la request
				return parseCookieHeader(context.headers.get('Cookie') ?? '').filter(
					(cookie) => cookie.value !== undefined
				) as { name: string; value: string }[];
			},
			setAll(cookiesToSet) {
				// escribir cookies en la response de Astro
				cookiesToSet.forEach(({ name, value, options }) => {
					context.cookies.set(name, value, options);
				});
			},
		},
	});

	return supabase;
}
