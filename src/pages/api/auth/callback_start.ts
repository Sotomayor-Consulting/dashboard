// src/pages/api/auth/callback.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get('code');
	const next = searchParams.get('next') || '/';

	try {
		if (code) {
			const { error } = await supabase.auth.exchangeCodeForSession(code);
			if (!error) {
				const { data: sessionData } = await supabase.auth.getSession();
				if (sessionData.session) {
					cookies.set('sb-access-token', sessionData.session.access_token, {
						path: '/',
						httpOnly: true,
						secure: true,
						sameSite: 'lax',
					});
					cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
						path: '/',
						httpOnly: true,
						secure: true,
						sameSite: 'lax',
					});
					return redirect(next);
				}
			}
		}
		return redirect(
			`/?status=error&msg=${encodeURIComponent('Error en autenticación')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`/?status=error&msg=${msg}`);
	}
};
