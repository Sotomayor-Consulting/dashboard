import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { getCanonicalCompanyIdForIncorporation } from '@domains/companies/canonical-company';
import {
	createCompanyAddress,
	type CompanyAddressInput,
} from '@domains/companies/addresses';

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

	const body = (await request.json().catch(() => null)) as
		| CompanyAddressInput
		| null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const companyId = await getCanonicalCompanyIdForIncorporation(
			supabase,
			incorporationId,
		);
		if (!companyId) {
			return json(409, { ok: false, error: 'COMPANY_NOT_CREATED' });
		}

		const address = await createCompanyAddress(
			supabase,
			incorporationId,
			companyId,
			body,
			user.id,
		);
		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[company_addresses:create]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
