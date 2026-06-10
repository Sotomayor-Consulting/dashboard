import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import { createCompanyAddress } from '@domains/companies/addresses';
import { companyAddressSchema } from '@modules/companies/schemas/company-address.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('incorporations.addresses');

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
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
		const companyId = await getCompanyIdForIncorporation(
			context.supabase,
			incorporationId,
		);
		if (!companyId) {
			return json(409, { ok: false, error: 'COMPANY_NOT_CREATED' });
		}

		const address = await createCompanyAddress(
			context.supabase,
			companyId,
			input,
			context.user.id,
		);
		return json(200, { ok: true, data: address });
	} catch (error) {
		log.error('create', { error });
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
