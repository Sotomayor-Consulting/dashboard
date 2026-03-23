// src/pages/api/generales/estado-incorporacion.ts
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { SECURITY_HEADERS } from '@lib/security/headers';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url }) => {
	try {
		// Cliente Supabase SSR
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// === 1. OBTENER empresaId DEL QUERY ===
		const empresaId = url.searchParams.get('empresaId');
		// console.log('empresaId recibido:', empresaId);

		let data: any;

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return new Response(JSON.stringify({ error: 'No autenticado' }), {
				status: 401,
				headers: SECURITY_HEADERS,
			});
		}

		if (empresaId) {
			// === BUSCAR POR empresa_incorporacion_id (TU PK) ===
			const { data: queryData, error } = await supabase
				.from('empresas_incorporaciones')
				.select('estado_de_incorporacion')
				.eq('empresa_incorporacion_id', empresaId)
				.eq('user_id', user.id)
				.single();

			if (error) {
				// console.error('Error Supabase:', error);
				return new Response(
					JSON.stringify({
						error: 'Empresa no encontrada',
						details: error.message,
					}),
					{ status: 404, headers: SECURITY_HEADERS },
				);
			}

			data = queryData;
			// console.log('Datos por empresaId:', data);
		} else {
			const { data: queryData, error } = await supabase
				.from('empresas_incorporaciones')
				.select('estado_de_incorporacion')
				.eq('user_id', user.id)
				.order('updated_at', { ascending: false })
				.limit(1)
				.single();

			if (error || !queryData) {
			return new Response(JSON.stringify({ error: 'No hay empresas' }), {
					status: 404,
					headers: SECURITY_HEADERS,
				});
			}

			data = queryData;
			// console.log('Datos por usuario:', data);
		}

		// === RESPUESTA EXITOSA ===
		return new Response(
			JSON.stringify({ estado: data.estado_de_incorporacion }),
			{ status: 200, headers: SECURITY_HEADERS },
		);
	} catch (error: any) {
		// console.error('Error general:', error);
		return new Response(
			JSON.stringify({ error: 'Error interno' }),
			{ status: 500, headers: SECURITY_HEADERS },
		);
	}
};
