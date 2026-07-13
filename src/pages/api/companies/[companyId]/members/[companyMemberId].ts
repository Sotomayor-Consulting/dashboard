import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	deleteCompanyMember,
	updateCompanyMember,
	type CompanyMemberInput,
} from '@domains/companies/company-members';
import { BusinessRuleError } from '@domains/companies/rules/errors';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.members');

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseCompanyId = (raw: string | undefined) => {
	const trimmed = raw?.trim();
	if (!trimmed) return null;
	return UUID_RE.test(trimmed) ? trimmed : null;
};

const parseCompanyMemberId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveRequestContext(
	request: Request,
	cookies: AstroCookies,
	params: Record<string, string | undefined>,
) {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) {
		return { error: json(400, { ok: false, error: 'INVALID_COMPANY_ID' }) };
	}

	const companyMemberId = parseCompanyMemberId(params.companyMemberId);
	if (!companyMemberId) {
		return { error: json(400, { ok: false, error: 'INVALID_MEMBER_ID' }) };
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return { error: context.error };

	return {
		supabase: context.supabase,
		user: context.user,
		companyId,
		companyMemberId,
	};
}

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	try {
		const context = await resolveRequestContext(request, cookies, params);
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
			context.companyMemberId,
			body,
			context.user.id,
		);

		return json(200, { ok: true, data: member });
	} catch (error) {
		log.error('update', { error });
		if (error instanceof BusinessRuleError) {
			return json(422, { ok: false, error: error.message, code: error.code });
		}
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
	try {
		const context = await resolveRequestContext(request, cookies, params);
		if ('error' in context) return context.error;

		await deleteCompanyMember(
			context.supabase,
			context.companyId,
			context.companyMemberId,
			context.user.id,
		);

		return json(200, { ok: true });
	} catch (error) {
		log.error('delete', { error });
		if (error instanceof BusinessRuleError) {
			return json(422, { ok: false, error: error.message, code: error.code });
		}
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
