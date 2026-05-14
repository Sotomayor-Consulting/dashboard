export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const POST: APIRoute = async ({ request, cookies }) => {
	const { createSupabaseServerClient } = await import(
		'@infrastructure/supabase'
	);

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	let body: { empresa_id?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Body inválido' }), {
			status: 400,
			headers: SECURITY_HEADERS,
		});
	}

	const empresaId = body.empresa_id;
	if (!empresaId) {
		return new Response(
			JSON.stringify({ error: 'empresa_id es requerido' }),
			{ status: 400, headers: SECURITY_HEADERS },
		);
	}

	// Verificar que la empresa pertenece al usuario
	const { data: empresa, error: empresaErr } = await supabase
		.from('empresas_incorporaciones')
		.select('empresa_incorporacion_id')
		.eq('empresa_incorporacion_id', empresaId)
		.eq('user_id', user.id)
		.maybeSingle();

	if (empresaErr || !empresa) {
		return new Response(
			JSON.stringify({ error: 'Empresa no encontrada' }),
			{ status: 404, headers: SECURITY_HEADERS },
		);
	}

	// Crear booking intent usando supabaseAdmin (tiene acceso al schema meetings)
	const { data, error } = await supabaseAdmin.rpc(
		'create_booking_intent',
		{
			p_user_id: user.id,
			p_incorporation_id: empresaId,
			p_category: 'workflow_stage',
		},
	);

	if (error) {
		console.error('Error creating booking intent:', error);
		return new Response(
			JSON.stringify({ error: 'Error al crear intent' }),
			{ status: 500, headers: SECURITY_HEADERS },
		);
	}

	return new Response(JSON.stringify(data), {
		status: 200,
		headers: SECURITY_HEADERS,
	});
};
