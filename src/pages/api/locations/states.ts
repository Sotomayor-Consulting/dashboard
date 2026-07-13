import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { listStatesByCountry } from '@domains/locations/states';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('locations.states');

export const prerender = false;

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const raw = url.searchParams.get('countryId');
	const countryId = raw ? Number(raw) : NaN;
	if (!Number.isInteger(countryId) || countryId <= 0) {
		return new Response(
			JSON.stringify({ ok: false, error: 'INVALID_COUNTRY_ID' }),
			{
				status: 400,
				headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
			},
		);
	}

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const data = await listStatesByCountry(supabase, countryId);
		return new Response(JSON.stringify({ ok: true, data }), {
			status: 200,
			headers: {
				...SECURITY_HEADERS,
				'Content-Type': 'application/json',
				'Cache-Control': CACHE_CONTROL,
			},
		});
	} catch (error) {
		log.error('states', { error });
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
