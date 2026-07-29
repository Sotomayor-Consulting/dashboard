export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { BUCKETS, createScopedStorage } from '@infrastructure/storage';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('storage.get-signed-url');

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();

		if (userErr || !user) {
			log.error('Sin sesión', { message: userErr?.message });
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

		// Sin verificación de ownership en el route: la autorización la hace RLS
		// sobre `storage.objects` con la sesión del usuario.
		const signedUrl = await createScopedStorage(supabase).createSignedUrl(
			BUCKETS.documents,
			path,
		);

		return new Response(JSON.stringify({ signedUrl }), { status: 200 });
	} catch (e: unknown) {
		log.error('Excepción', { error: e });
		return new Response(JSON.stringify({ error: 'Error inesperado' }), {
			status: 500,
		});
	}
};
