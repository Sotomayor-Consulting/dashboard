// src/lib/supabase-ssr.ts
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function createSupabaseServerClient(context: {
	headers: Headers;
	cookies: AstroCookies;
}) {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
	const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				// Leemos TODAS las cookies que venían en la request
				const cookieHeader = context.headers.get('Cookie') ?? '';
				const parsed = parseCookieHeader(cookieHeader);
				// console.log("[SSR] getAll cookies ->", parsed);
				return parsed;
			},
			setAll(cookiesToSet) {
				// Supabase nos dice qué cookies setear y con qué opciones
				cookiesToSet.forEach(({ name, value, options }) => {
					// console.log("[SSR] set cookie ->", name, options);
					context.cookies.set(name, value, options);
				});
			},
		},
	});

	return supabase;
}
