export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');

		if (!at?.value || !rt?.value) {
			return new Response(JSON.stringify({ error: 'No autenticado' }), {
				status: 401,
			});
		}

		const { error: sessionErr } = await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});

		if (sessionErr) {
			return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
				status: 401,
			});
		}

		const body = await request.json();
		const { path } = body;

		if (!path) {
			return new Response(
				JSON.stringify({ error: 'Falta el path del archivo' }),
				{ status: 400 },
			);
		}

		const { data, error } = await supabase.storage
			.from('test')
			.createSignedUrl(path, 3600);

		if (error) {
			console.error('[SIGNED-URL] Error:', error);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
			});
		}

		return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
			status: 200,
		});
	} catch (e: unknown) {
		console.error('[SIGNED-URL] Excepción:', e);
		return new Response(
			JSON.stringify({ error: 'Error inesperado' }),
			{ status: 500 },
		);
	}
};
