import type { APIRoute } from 'astro';

import { getAdminUserDetail } from '@domains/admin/users';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';

/**
 * GET /api/admin/users/[id]
 *
 * Devuelve el detalle de un usuario para el drawer.
 * Solo accesible para `admin` u `operaciones`.
 */
export const GET: APIRoute = async ({ params, request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
		});
	}

	const id = params['id'];
	if (!id) {
		return new Response(JSON.stringify({ error: 'Falta id' }), { status: 400 });
	}

	const user = await getAdminUserDetail(supabase, id);
	if (!user) {
		return new Response(JSON.stringify({ error: 'No encontrado' }), {
			status: 404,
		});
	}

	return new Response(JSON.stringify(user), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

/**
 * PATCH /api/admin/users/[id]
 *
 * Actualiza campos editables del usuario. Solo `admin`.
 * Campos permitidos: nombre, apellido, organizacion, cargo, telf, estado.
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
		});
	}

	// Solo admin puede editar
	const viewerId = claims.claims.sub;
	const { data: viewerRolesRaw } = await supabaseAdmin
		.from('user_roles')
		.select('roles(name)')
		.eq('user_id', viewerId);
	const viewerRoles = (viewerRolesRaw ?? []).flatMap(
		(r: { roles: { name: string } | { name: string }[] | null }) => {
			if (!r.roles) return [];
			return Array.isArray(r.roles)
				? r.roles.map((x) => x.name)
				: [r.roles.name];
		},
	);
	if (!viewerRoles.includes('admin')) {
		return new Response(
			JSON.stringify({ error: 'Solo administradores pueden editar usuarios' }),
			{ status: 403 },
		);
	}

	const id = params['id'];
	if (!id) {
		return new Response(JSON.stringify({ error: 'Falta id' }), { status: 400 });
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return new Response(JSON.stringify({ error: 'Body inválido' }), {
			status: 400,
		});
	}

	// Whitelist de campos editables (evita actualizar columnas sensibles)
	const ALLOWED = ['nombre', 'apellido', 'organizacion', 'cargo', 'telf', 'estado'];
	const update: Record<string, unknown> = {};
	for (const k of ALLOWED) {
		if (k in body) update[k] = body[k];
	}
	if (Object.keys(update).length === 0) {
		return new Response(
			JSON.stringify({ error: 'No hay campos válidos para actualizar' }),
			{ status: 400 },
		);
	}

	const { error } = await supabaseAdmin
		.from('usuarios')
		.update(update)
		.eq('user_id', id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
