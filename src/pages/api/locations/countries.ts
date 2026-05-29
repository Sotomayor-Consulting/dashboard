import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { listCountries } from '@domains/locations/countries';

export const prerender = false;

// Cache fuerte: 1h fresh + 1d stale-while-revalidate. Los datos geográficos
// casi nunca cambian.
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

export const GET: APIRoute = async ({ request, cookies }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const data = await listCountries(supabase);
		return new Response(JSON.stringify({ ok: true, data }), {
			status: 200,
			headers: {
				...SECURITY_HEADERS,
				'Content-Type': 'application/json',
				'Cache-Control': CACHE_CONTROL,
			},
		});
	} catch (error) {
		console.error('[locations:countries]', error);
		return new Response(
			JSON.stringify({
				ok: false,
				error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
			}),
			{
				status: 500,
				headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
			},
		);
	}
};
