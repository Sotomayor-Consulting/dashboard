import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import {
	deleteCompanyMember,
	updateCompanyMember,
	type CompanyMemberInput,
} from '@domains/companies/company-members';
import { BusinessRuleError } from '@domains/companies/rules/errors';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('incorporations.members');

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
		return {
			error: json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' }),
		};
	}
	if (!memberId) {
		return { error: json(400, { ok: false, error: 'INVALID_MEMBER_ID' }) };
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return { error: context.error };

	const companyId = await getCompanyIdForIncorporation(
		context.supabase,
		incorporationId,
	);
	if (!companyId) {
		return { error: json(409, { ok: false, error: 'COMPANY_NOT_CREATED' }) };
	}

	return {
		supabase: context.supabase,
		user: context.user,
		companyId,
		memberId,
	};
}

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	try {
		const context = await resolveRequestContext(request, cookies, params);
		if ('error' in context) return context.error;

		const body = (await request
			.json()
			.catch(() => null)) as CompanyMemberInput | null;
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
			context.memberId,
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
