import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	updateCompanyInfo,
	type CompanyInfoInput,
} from '@domains/companies/company-info';
import { BusinessRuleError } from '@domains/companies/rules/errors';
import { companyInfoSchema } from '@modules/companies/islands/company-details/schemas/company-info.schema';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.info');

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateCompanyId = (raw: string | undefined) => {
	if (!raw) return null;
	const trimmed = raw.trim();
	return UUID_RE.test(trimmed) ? trimmed : null;
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const companyId = validateCompanyId(params.companyId);
	if (!companyId) return json(400, { ok: false, error: 'INVALID_COMPANY_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	if (!body) return json(400, { ok: false, error: 'INVALID_BODY' });

	const parsed = companyInfoSchema.safeParse(body);
	if (!parsed.success) {
		return json(400, {
			ok: false,
			error: parsed.error.issues[0]?.message ?? 'INVALID_BODY',
		});
	}

	try {
		const company = await updateCompanyInfo(
			context.supabase,
			companyId,
			parsed.data as CompanyInfoInput,
			context.user.id,
		);
		return json(200, { ok: true, data: company });
	} catch (error) {
		log.error('update', { error });
		if (error instanceof BusinessRuleError) {
			return json(422, { ok: false, error: error.message, code: error.code });
		}
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'COMPANY_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
