import type { APIRoute } from 'astro';

import { getAdminEmpresaDetail } from '@domains/admin/empresas';
import { createSupabaseServerClient } from '@infrastructure/supabase';

/**
 * GET /api/admin/empresas/[id]
 * Detalle de empresa legal con members y addresses.
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

	const empresa = await getAdminEmpresaDetail(supabase, id);
	if (!empresa) {
		return new Response(JSON.stringify({ error: 'No encontrada' }), {
			status: 404,
		});
	}

	return new Response(JSON.stringify(empresa), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
