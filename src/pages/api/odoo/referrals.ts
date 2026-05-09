import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { getReferralsByEmail } from '@integrations/odoo/partners';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

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
				headers: SECURITY_HEADERS,
			},
		);
	}

	// 4) Usar el email verificado para llamar a Odoo
	const result = await getReferralsByEmail(user.email);

	// 5) Responder
	return new Response(JSON.stringify(result), {
		status: 200,
		headers: SECURITY_HEADERS,
	});
};
