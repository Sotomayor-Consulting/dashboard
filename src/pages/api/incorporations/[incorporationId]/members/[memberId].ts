import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { ROLES, hasAnyRole } from '@shared/roles';
import { ensureCanonicalCompanyForIncorporation } from '@domains/companies/canonical-company';
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

const canEdit = (roles: string[]) =>
	hasAnyRole(roles, [ROLES.ADMIN, ROLES.GERENCIA, ROLES.OPERACIONES]);

const parseMemberId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveRequestContext(
	request: Request,
	cookies: AstroCookies,
	locals: App.Locals,
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

	if (authError || !user) {
		return { error: json(401, { ok: false, error: 'NO_AUTH_USER' }) };
	}

	if (!canEdit((locals.userRoles || []) as string[])) {
		return { error: json(403, { ok: false, error: 'FORBIDDEN' }) };
	}

	const companyId = await ensureCanonicalCompanyForIncorporation(
		supabase,
		incorporationId,
		user.id,
	);

	return { supabase, user, companyId, memberId };
}

export const PATCH: APIRoute = async ({
	request,
	cookies,
	locals,
	params,
}) => {
	try {
		const context = await resolveRequestContext(
			request,
			cookies,
			locals,
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
	locals,
	params,
}) => {
	try {
		const context = await resolveRequestContext(
			request,
			cookies,
			locals,
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
