import type { APIRoute } from 'astro';
import {
	deleteCompanyAddress,
	updateCompanyAddress,
} from '@domains/companies/addresses';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	companyAddressSchema,
} from '@modules/companies/schemas/company-address.schema';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.addresses');

const parseCompanyId = (raw: string | undefined) => raw?.trim() || null;
const parseAddressId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveContext({ request, cookies, params }: Parameters<APIRoute>[0]) {
	const companyId = parseCompanyId(params.companyId);
	const addressId = parseAddressId(params.addressId);

	if (!companyId) {
		return { error: json(400, { ok: false, error: 'MISSING_COMPANY_ID' }) };
	}
	if (!addressId) {
		return { error: json(400, { ok: false, error: 'INVALID_ADDRESS_ID' }) };
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return { error: context.error };

	return {
		supabase: context.supabase,
		user: context.user,
		companyId,
		addressId,
	};
}

export const PATCH: APIRoute = async (context) => {
	const resolved = await resolveContext(context);
	if ('error' in resolved) return resolved.error;

	const body = await context.request.json().catch(() => null);
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
		const address = await updateCompanyAddress(
			resolved.supabase,
			resolved.companyId,
			resolved.addressId,
			input,
			resolved.user.id,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		log.error('update', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'COMPANY_ADDRESS_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};

export const DELETE: APIRoute = async (context) => {
	const resolved = await resolveContext(context);
	if ('error' in resolved) return resolved.error;

	try {
		await deleteCompanyAddress(
			resolved.supabase,
			resolved.companyId,
			resolved.addressId,
			resolved.user.id,
		);

		return json(200, { ok: true });
	} catch (error) {
		log.error('delete', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'COMPANY_ADDRESS_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
