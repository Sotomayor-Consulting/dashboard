import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { getReferralsByEmail } from '@integrations/odoo/partners';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

type Referral = {
	name: string;
	email?: string | null;
	create_date?: string;
};

export const GET: APIRoute = async ({ cookies, request }) => {
	// 1) Cliente Supabase SSR
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	// 2) Obtener usuario
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user || !user.email) {
		console.error('[CHART-ODOO] Error getUser:', userErr);
		return new Response(
			JSON.stringify({ error: 'Sesión inválida o sin email' }),
			{
				status: 401,
				headers: SECURITY_HEADERS,
			},
		);
	}

	// 4) Llamar a Odoo
	const result = await getReferralsByEmail(user.email);

	if (!result?.success) {
		console.error('[CHART-ODOO] Odoo error:', result?.error);
		return new Response(
			JSON.stringify({ error: 'No se pudieron obtener los referidos' }),
			{
				status: 500,
				headers: SECURITY_HEADERS,
			},
		);
	}

	const data = (result.data ?? []) as Referral[];

	// 5) Agrupar por día
	const countsByDay = new Map<string, number>();

	for (const r of data) {
		if (!r.create_date) continue;

		// según formato de Odoo, suele ser "2024-11-28 15:30:22"
		const day = r.create_date.split(' ')[0] ?? ''; // "YYYY-MM-DD"
		if (!day) continue;
		const prev = countsByDay.get(day) ?? 0;
		countsByDay.set(day, prev + 1);
	}

	// 6) Ordenar fechas
	const categories = Array.from(countsByDay.keys()).sort();
	const series = categories.map((d) => countsByDay.get(d) ?? 0);

	return new Response(
		JSON.stringify({
			categories,
			series,
		}),
		{
			status: 200,
			headers: {
				...SECURITY_HEADERS,
				'Cache-Control': 'private, max-age=300',
			},
		},
	);
};
