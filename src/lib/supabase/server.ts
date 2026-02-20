// src/lib/supabase/server.ts
// ─── Supabase SSR Client (per-request) ─────────────────
// Usa @supabase/ssr para manejar cookies correctamente.
// SIEMPRE crear una instancia nueva por request. NO reutilizar como singleton.
//
// Docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client

import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

/** Explicit context: { headers, cookies } — used in API routes & middleware */
interface ServerClientContext {
	headers: Headers;
	cookies: AstroCookies;
}

/** Astro global context: { request: { headers }, cookies } — used in .astro components */
interface AstroGlobalContext {
	request: Request;
	cookies: AstroCookies;
}

type SupabaseContext = ServerClientContext | AstroGlobalContext;

/** Type guard: does the context have a `request` property (Astro global)? */
function isAstroGlobal(ctx: SupabaseContext): ctx is AstroGlobalContext {
	return 'request' in ctx && ctx.request instanceof Request;
}

/**
 * Crea un cliente Supabase para server-side con manejo de cookies.
 *
 * @param context - Acepta dos formatos:
 *   1. `{ headers, cookies }` — para API routes y middleware.
 *   2. El objeto `Astro` global — para componentes .astro (tiene `request.headers`).
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
 * // En un componente Astro (shorthand):
 * const supabase = createSupabaseServerClient(Astro);
 *
 * // En un componente Astro (explicit):
 * const supabase = createSupabaseServerClient({ headers: Astro.request.headers, cookies: Astro.cookies });
 * ```
 */
export function createSupabaseServerClient(context: SupabaseContext) {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Missing Supabase environment variables: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required.',
		);
	}

	// Normalize: extract headers from Astro global or use directly
	const headers = isAstroGlobal(context)
		? context.request.headers
		: context.headers;
	const { cookies } = context;

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				const parsed = parseCookieHeader(headers.get('Cookie') ?? '');
				// parseCookieHeader puede retornar value?: string, pero CookieMethodsServer
				// requiere value: string. Filtramos entradas sin valor.
				return parsed.filter(
					(c): c is { name: string; value: string } =>
						typeof c.value === 'string',
				);
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, options);
				});
			},
		},
	});
}
