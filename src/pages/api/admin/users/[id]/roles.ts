import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';

/**
 * PATCH /api/admin/users/[id]/roles
 *
 * Body: { role: 'admin' | 'operaciones' | 'cliente' | …, enabled: boolean }
 *
 * Reglas de seguridad:
 *  - Solo `admin` puede modificar roles.
 *  - Asignar rol `admin` requiere también ser `admin` (no ops).
 *  - Cualquier otro rol queda bloqueado con 403.
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

	// Supabase devuelve `roles` como objeto cuando la FK es 1:1, pero el
	// generador de tipos a veces lo infiere como array. Tratamos ambos casos.
	const viewerRoles = (viewerRolesRaw ?? [])
		.flatMap((r: { roles: { name: string } | { name: string }[] | null }) => {
			if (!r.roles) return [];
			return Array.isArray(r.roles)
				? r.roles.map((x) => x.name)
				: [r.roles.name];
		})
		.filter(Boolean);

	const isAdmin = viewerRoles.includes('admin');
	if (!isAdmin) {
		return new Response(
			JSON.stringify({ error: 'Solo administradores pueden modificar roles' }),
			{ status: 403 },
		);
	}

	const targetUserId = params['id'];
	if (!targetUserId) {
		return new Response(JSON.stringify({ error: 'Falta id de usuario' }), {
			status: 400,
		});
	}

	let body: { role?: string; enabled?: boolean };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Body inválido' }), {
			status: 400,
		});
	}

	const { role, enabled } = body;
	if (!role || typeof enabled !== 'boolean') {
		return new Response(JSON.stringify({ error: 'role y enabled requeridos' }), {
			status: 400,
		});
	}

	// Obtener id del rol por nombre
	const { data: roleRow, error: roleErr } = await supabaseAdmin
		.from('roles')
		.select('id')
		.eq('name', role)
		.maybeSingle();

	if (roleErr || !roleRow) {
		return new Response(
			JSON.stringify({ error: `Rol "${role}" no existe` }),
			{ status: 404 },
		);
	}

	if (enabled) {
		// INSERT (idempotente: si ya existe ignoramos el conflicto)
		const { error } = await supabaseAdmin
			.from('user_roles')
			.upsert(
				{ user_id: targetUserId, rol_id: roleRow.id },
				{ onConflict: 'user_id,rol_id', ignoreDuplicates: true },
			);
		if (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
			});
		}
	} else {
		const { error } = await supabaseAdmin
			.from('user_roles')
			.delete()
			.eq('user_id', targetUserId)
			.eq('rol_id', roleRow.id);
		if (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
			});
		}
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
