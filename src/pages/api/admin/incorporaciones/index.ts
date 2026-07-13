import type { APIRoute } from 'astro';

import { listAdminCompanies } from '@domains/admin/incorporations';
import { createSupabaseServerClient } from '@infrastructure/supabase';

/**
 * GET /api/admin/empresas
 * Lista de empresas para la tabla del panel admin.
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

	const empresas = await listAdminCompanies(supabase);

	return new Response(JSON.stringify(empresas), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
