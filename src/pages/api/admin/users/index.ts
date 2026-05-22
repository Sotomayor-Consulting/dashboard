import type { APIRoute } from 'astro';

import { listAdminUsers } from '@domains/admin/users';
import { createSupabaseServerClient } from '@infrastructure/supabase';

/**
 * GET /api/admin/users
 * Lista de usuarios para la tabla del panel admin.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
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

	const users = await listAdminUsers(supabase);

	return new Response(JSON.stringify(users), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
