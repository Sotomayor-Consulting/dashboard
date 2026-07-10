import type { APIRoute } from 'astro';
import { archiveMemberTaxIdentification } from '@domains/members/tax-identifications';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('members.tax-identifications');

const parseMemberId = (raw: string | undefined) => raw?.trim() || null;
const parseTaxIdentificationId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
	const memberId = parseMemberId(params.memberId);
	const taxIdentificationId = parseTaxIdentificationId(
		params.taxIdentificationId,
	);
	if (!memberId) return json(400, { ok: false, error: 'MISSING_MEMBER_ID' });
	if (!taxIdentificationId) {
		return json(400, { ok: false, error: 'INVALID_TAX_IDENTIFICATION_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	try {
		const row = await archiveMemberTaxIdentification(
			context.supabase,
			memberId,
			taxIdentificationId,
			context.user.id,
		);
		return json(200, { ok: true, data: row });
	} catch (error) {
		log.error('archive', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'TAX_ID_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
