export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		const { data: { user }, error: userErr } = await supabase.auth.getUser();

		if (userErr || !user) {
			console.error('[SIGNED-URL] Sin sesión:', userErr?.message);
			return new Response(JSON.stringify({ error: 'No autenticado' }), {
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
		return new Response(JSON.stringify({ error: 'Error inesperado' }), {
			status: 500,
		});
	}
};
