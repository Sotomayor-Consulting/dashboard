import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { createCanonicalCompanyFromIncorporation } from '@domains/companies/canonical-company';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

	if (authError || claimsError || !user || !claimsData?.claims) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	if (!canManageCompanyData(extractTokenRoleNames(claimsData.claims))) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	try {
		const companyId = await createCanonicalCompanyFromIncorporation(
			supabase,
			incorporationId,
			user.id,
			'draft',
		);

		return json(200, { ok: true, data: { company_id: companyId } });
	} catch (error) {
		console.error('[companies:create-from-incorporation]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
