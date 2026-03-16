import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { getReferralsByEmail } from '@services/partnerService';

export const GET: APIRoute = async ({ cookies, request }) => {
	// 1) Cliente Supabase SSR
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	// 2) Obtener usuario actual
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user || !user.email) {
		return new Response(
			JSON.stringify({ error: 'Sesión inválida o sin email' }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	// 4) Usar el email verificado para llamar a Odoo
	const result = await getReferralsByEmail(user.email);

	// 5) Responder
	return new Response(JSON.stringify(result), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
