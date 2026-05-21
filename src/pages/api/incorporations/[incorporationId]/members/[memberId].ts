import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { getCanonicalCompanyIdForIncorporation } from '@domains/companies/canonical-company';
import {
	softDeleteCompanyMember,
	updateCompanyMember,
	type CompanyMemberInput,
} from '@domains/companies/company-members';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

const parseMemberId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveRequestContext(
	request: Request,
	cookies: AstroCookies,
	params: Record<string, string | undefined>,
) {
	const incorporationId = params.incorporationId?.trim();
	const memberId = parseMemberId(params.memberId);
	if (!incorporationId) {
		return { error: json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' }) };
	}
	if (!memberId) {
		return { error: json(400, { ok: false, error: 'INVALID_MEMBER_ID' }) };
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

	return { supabase, user, companyId, memberId };
}

export const PATCH: APIRoute = async ({
	request,
	cookies,
	params,
}) => {
	try {
		const context = await resolveRequestContext(
			request,
			cookies,
			params,
		);
		if ('error' in context) return context.error;

		const body = (await request.json().catch(() => null)) as
			| CompanyMemberInput
			| null;
		if (!body) {
			return json(400, { ok: false, error: 'INVALID_BODY' });
		}

		const member = await updateCompanyMember(
			context.supabase,
			context.companyId,
			context.memberId,
			body,
			context.user.id,
		);

		return json(200, { ok: true, data: member });
	} catch (error) {
		console.error('[company_members:update]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};

export const DELETE: APIRoute = async ({
	request,
	cookies,
	params,
}) => {
	try {
		const context = await resolveRequestContext(
			request,
			cookies,
			params,
		);
		if ('error' in context) return context.error;

		const body = (await request.json().catch(() => null)) as
			| { reason?: string }
			| null;
		const member = await softDeleteCompanyMember(
			context.supabase,
			context.companyId,
			context.memberId,
			context.user.id,
			body?.reason ?? null,
		);

		return json(200, { ok: true, data: member });
	} catch (error) {
		console.error('[company_members:delete]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
