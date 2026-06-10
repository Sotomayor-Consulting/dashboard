import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import {
	softDeleteCompanyAddress,
	updateCompanyAddress,
} from '@domains/companies/addresses';
import {
	companyAddressDeleteSchema,
	companyAddressSchema,
} from '@modules/companies/schemas/company-address.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('incorporations.addresses');

const parseAddressId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveContext({ request, cookies, params }: Parameters<APIRoute>[0]) {
	const incorporationId = params.incorporationId?.trim();
	const addressId = parseAddressId(params.addressId);

	if (!incorporationId) {
		return { error: json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' }) };
	}
	if (!addressId) {
		return { error: json(400, { ok: false, error: 'INVALID_ADDRESS_ID' }) };
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
		incorporationId,
		companyId,
		addressId,
	};
}

export const PATCH: APIRoute = async (context) => {
	try {
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
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};

export const DELETE: APIRoute = async (context) => {
	try {
		const resolved = await resolveContext(context);
		if ('error' in resolved) return resolved.error;

		const body = await context.request.json().catch(() => null);
		const parsed = companyAddressDeleteSchema.safeParse(body ?? {});
		if (!parsed.success) {
			return json(400, { ok: false, error: 'INVALID_BODY' });
		}

		const address = await softDeleteCompanyAddress(
			resolved.supabase,
			resolved.companyId,
			resolved.addressId,
			resolved.user.id,
			parsed.data.reason ?? null,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		log.error('delete', { error });
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
