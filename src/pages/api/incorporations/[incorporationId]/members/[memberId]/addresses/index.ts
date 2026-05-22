import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import {
	createCompanyMemberAddress,
	type CompanyMemberAddressInput,
} from '@domains/companies/company-members';

export const prerender = false;

const parseMemberId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	const memberId = parseMemberId(params.memberId);

	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}
	if (!memberId) {
		return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as
		| CompanyMemberAddressInput
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

		const address = await createCompanyMemberAddress(
			context.supabase,
			companyId,
			memberId,
			body,
			context.user.id,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[company_member_addresses:create]', error);
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'COMPANY_MEMBER_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
