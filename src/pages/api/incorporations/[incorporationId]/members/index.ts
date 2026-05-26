import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import {
	createCompanyMember,
	type CompanyMemberInput,
} from '@domains/companies/company-members';
import { BusinessRuleError } from '@domains/companies/rules/errors';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as
		| CompanyMemberInput
		| null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const companyId = await getCompanyIdForIncorporation(
			context.supabase,
			incorporationId,
		);
		if (!companyId) {
			return json(409, { ok: false, error: 'COMPANY_NOT_CREATED' });
		}

		const member = await createCompanyMember(
			context.supabase,
			companyId,
			body,
			context.user.id,
		);

		return json(200, { ok: true, data: member });
	} catch (error) {
		console.error('[company_members:create]', error);
		if (error instanceof BusinessRuleError) {
			return json(422, { ok: false, error: error.message, code: error.code });
		}
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
