import type { APIRoute } from 'astro';
import {
	archiveInternalAddress,
	updateInternalAddress,
} from '@domains/catalogs/internal-addresses';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { internalAddressUpdateSchema } from '@modules/companies/schemas/compliance.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('catalogs.internal-addresses');

const parseAddressId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const addressId = parseAddressId(params.addressId);
	if (!addressId) return json(400, { ok: false, error: 'INVALID_ADDRESS_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	const parsed = internalAddressUpdateSchema.safeParse(body);
	if (!parsed.success) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const row = await updateInternalAddress(
			context.supabase,
			addressId,
			parsed.data,
			context.user.id,
		);
		return json(200, { ok: true, data: row });
	} catch (error) {
		log.error('update', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'INTERNAL_ADDRESS_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
	const addressId = parseAddressId(params.addressId);
	if (!addressId) return json(400, { ok: false, error: 'INVALID_ADDRESS_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	try {
		const row = await archiveInternalAddress(
			context.supabase,
			addressId,
			context.user.id,
		);
		return json(200, { ok: true, data: row });
	} catch (error) {
		log.error('archive', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'INTERNAL_ADDRESS_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
