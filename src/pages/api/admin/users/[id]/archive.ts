import type { APIRoute } from 'astro';

import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';

/**
 * PATCH /api/admin/users/[id]/archive
 *
 * Soft delete: marca `usuarios.estado = 'archivado'`. Solo `admin`.
 * No usamos un hard delete porque hay FKs en empresas_incorporaciones,
 * pagos, etc., y un usuario archivado debe poder restaurarse.
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
			JSON.stringify({ error: 'Solo administradores pueden archivar' }),
			{ status: 403 },
		);
	}

	const id = params['id'];
	if (!id) {
		return new Response(JSON.stringify({ error: 'Falta id' }), { status: 400 });
	}

	const { error } = await supabaseAdmin
		.from('usuarios')
		.update({ estado: 'archivado' })
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
