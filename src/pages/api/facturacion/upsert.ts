// src/pages/api/facturacion/upsert.ts
// ─── Insertar datos de facturación ──────────────────────
// Requiere autenticación. Valida que el userId del body
// coincida con el usuario autenticado (previene suplantación).
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const POST: APIRoute = async ({ request, cookies }) => {
	// ─── 1) Autenticación (server-verified via getUser) ──
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return new Response(
			JSON.stringify({ error: 'No autenticado' }),
			{
				status: 401,
				headers: SECURITY_HEADERS,
			},
		);
	}

	try {
		// ─── 2) Parsear body ─────────────────────────────
		const body = await request.json();

		const {
			userId,
			persona, // "natural" | "juridica"
			nombre_razon,
			email,
			telefono_numero, // ej. "0999999999"
			id_tipo, // "Cedula" | "RUC" | "ID" | "Pasaporte" | "EIN"
			id_numero,
			direccion,
			ciudad,
			pais, // ISO del país (según tu select)
		} = body || {};

		if (!userId) {
			return new Response(
				JSON.stringify({ error: 'userId is required' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// ─── 3) Validar que el userId del body sea el usuario autenticado ──
		if (userId !== user.id) {
			return new Response(
				JSON.stringify({ error: 'No autorizado para este usuario' }),
				{
					status: 403,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// ─── 4) Construir row e insertar ─────────────────
		const row: Record<string, any> = {
			user_id: userId,
			nombre_o_razon_social: nombre_razon || '',
			correo: email || '',
			telefono: telefono_numero || '',
			documento_de_identidad: id_numero || '',
			direccion_linea_1: direccion || '',
			ciudad: ciudad || '',
			pais: pais || '',
			tipo_de_documento: id_tipo || '',
		};
		// columna con tilde
		row['personería'] = (persona || '').toLowerCase(); // "natural" | "juridica"

		const { data, error } = await supabaseAdmin
			.from('facturacion')
			.insert([row])
			.select('id')
			.single();

		if (error) {
			console.error('[billing/upsert] insert error:', error);
			return new Response(
				JSON.stringify({ error: 'Insert failed' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		return new Response(JSON.stringify({ id: data?.id || null }), {
			status: 200,
			headers: SECURITY_HEADERS,
		});
	} catch (e: any) {
		console.error('[billing/upsert] exception:', e);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: SECURITY_HEADERS,
			},
		);
	}
};
