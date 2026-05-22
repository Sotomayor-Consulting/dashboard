import type { APIRoute } from 'astro';

import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';

/**
 * POST /api/admin/users/invite
 *
 * Body: { email: string }
 *
 * Envía invitación por email vía Supabase Auth (link mágico de
 * sign-up que aterriza en /api/auth/invite-callback).
 *
 * Solo `admin` u `operaciones` pueden invitar.
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
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
	if (!viewerRoles.some((r) => ['admin', 'operaciones'].includes(r))) {
		return new Response(
			JSON.stringify({ error: 'No autorizado' }),
			{ status: 403 },
		);
	}

	let body: { email?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Body inválido' }), {
			status: 400,
		});
	}

	const email = body.email?.trim().toLowerCase();
	if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
		return new Response(JSON.stringify({ error: 'Email inválido' }), {
			status: 400,
		});
	}

	const redirectTo = `${url.origin}/api/auth/invite-callback`;
	const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
		redirectTo,
	});

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
