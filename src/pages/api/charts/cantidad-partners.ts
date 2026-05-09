export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const GET: APIRoute = async ({ request, cookies }) => {
	// 1) Cliente Supabase SSR
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	// 2) Usuario
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	// 3) Rango opcional ?from=YYYY-MM-DD&to=YYYY-MM-DD
	const url = new URL(request.url);
	const from = url.searchParams.get('from') || null;
	const to = url.searchParams.get('to') || null;

	// 4) Llamar a la RPC
	const { data, error } = await supabase.rpc('referrals_by_day', {
		p_partner: user.id,
		p_from: from,
		p_to: to,
	});

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: SECURITY_HEADERS,
		});
	}

	// 5) Adaptar a ApexCharts
	const categories = (data ?? []).map((r: any) =>
		new Date(r.day).toLocaleDateString(),
	);
	const series = (data ?? []).map((r: any) => Number(r.total) || 0);

	return new Response(JSON.stringify({ categories, series }), {
		status: 200,
		headers: {
			...SECURITY_HEADERS,
			'Cache-Control': 'private, max-age=300',
		},
	});
};
