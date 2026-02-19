// src/lib/supabase/server.ts
// ─── Supabase SSR Client (per-request) ─────────────────
// Usa @supabase/ssr para manejar cookies correctamente.
// SIEMPRE crear una instancia nueva por request. NO reutilizar como singleton.
//
// Docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client

import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

interface ServerClientContext {
	headers: Headers;
	cookies: AstroCookies;
}

/**
 * Crea un cliente Supabase para server-side con manejo de cookies.
 *
 * @param context - Debe contener `headers` (de la Request) y `cookies` (de Astro).
 * @returns SupabaseClient configurado para SSR.
 *
 * @example
 * ```ts
 * // En un API route:
 * const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
 *
 * // En middleware:
 * const supabase = createSupabaseServerClient({ headers: context.request.headers, cookies: context.cookies });
 *
 * // En un componente Astro:
 * const supabase = createSupabaseServerClient({ headers: Astro.request.headers, cookies: Astro.cookies });
 * ```
 */
export function createSupabaseServerClient(context: ServerClientContext) {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Missing Supabase environment variables: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required.',
		);
	}

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				const parsed = parseCookieHeader(context.headers.get('Cookie') ?? '');
				// parseCookieHeader puede retornar value?: string, pero CookieMethodsServer
				// requiere value: string. Filtramos entradas sin valor.
				return parsed.filter(
					(c): c is { name: string; value: string } =>
						typeof c.value === 'string',
				);
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					context.cookies.set(name, value, options);
				});
			},
		},
	});
}
