import type { APIRoute } from 'astro';
import { createCompanyAddress } from '@domains/companies/addresses';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { companyAddressSchema } from '@modules/companies/schemas/company-address.schema';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.addresses');

const parseCompanyId = (raw: string | undefined) => raw?.trim() || null;

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) {
		return json(400, { ok: false, error: 'MISSING_COMPANY_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	const parsed = companyAddressSchema.safeParse(body);
	if (!parsed.success) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	const input = {
		...parsed.data,
		line2: parsed.data.line2 ?? null,
		county: parsed.data.county ?? null,
		zip: parsed.data.zip ?? null,
		state_id: parsed.data.state_id ?? null,
		country_id: parsed.data.country_id ?? null,
	};

	try {
		const address = await createCompanyAddress(
			context.supabase,
			companyId,
			input,
			context.user.id,
		);
		return json(200, { ok: true, data: address });
	} catch (error) {
		log.error('create', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status =
			message === 'COMPANY_NOT_FOUND'
				? 404
				: message === 'FORBIDDEN'
					? 403
					: message === 'INVALID_BODY'
						? 400
						: 500;
		return json(status, { ok: false, error: message });
	}
};
