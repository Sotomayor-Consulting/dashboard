import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { getCanonicalCompanyIdForIncorporation } from '@domains/companies/canonical-company';
import {
	softDeleteCompanyAddress,
	updateCompanyAddress,
	type CompanyAddressInput,
} from '@domains/companies/addresses';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

const parseAddressId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveContext({ request, cookies, params }: Parameters<APIRoute>[0]) {
	const incorporationId = params.incorporationId?.trim();
	const addressId = parseAddressId(params.addressId);

	if (!incorporationId) {
		return { error: json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' }) };
	}
	if (!addressId) {
		return { error: json(400, { ok: false, error: 'INVALID_ADDRESS_ID' }) };
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
		return { error: json(401, { ok: false, error: 'NO_AUTH_USER' }) };
	}

	if (!canManageCompanyData(extractTokenRoleNames(claimsData.claims))) {
		return { error: json(403, { ok: false, error: 'FORBIDDEN' }) };
	}

	const companyId = await getCanonicalCompanyIdForIncorporation(
		supabase,
		incorporationId,
	);
	if (!companyId) {
		return { error: json(409, { ok: false, error: 'COMPANY_NOT_CREATED' }) };
	}

	return { supabase, user, incorporationId, companyId, addressId };
}

export const PATCH: APIRoute = async (context) => {
	try {
		const resolved = await resolveContext(context);
		if ('error' in resolved) return resolved.error;

		const body = (await context.request.json().catch(() => null)) as
			| CompanyAddressInput
			| null;
		if (!body) {
			return json(400, { ok: false, error: 'INVALID_BODY' });
		}

		const address = await updateCompanyAddress(
			resolved.supabase,
			resolved.incorporationId,
			resolved.companyId,
			resolved.addressId,
			body,
			resolved.user.id,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[company_addresses:update]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};

export const DELETE: APIRoute = async (context) => {
	try {
		const resolved = await resolveContext(context);
		if ('error' in resolved) return resolved.error;

		const body = (await context.request.json().catch(() => null)) as
			| { reason?: string }
			| null;
		const address = await softDeleteCompanyAddress(
			resolved.supabase,
			resolved.incorporationId,
			resolved.companyId,
			resolved.addressId,
			resolved.user.id,
			body?.reason ?? null,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[company_addresses:delete]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
