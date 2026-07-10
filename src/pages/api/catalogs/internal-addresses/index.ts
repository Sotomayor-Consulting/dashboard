import type { APIRoute } from 'astro';
import {
	createInternalAddress,
	listInternalAddresses,
	type InternalAddressType,
} from '@domains/catalogs/internal-addresses';
import {
	json,
	requireAuthenticated,
	requireCompanyDataManager,
} from '@shared/api/company-data';
import { internalAddressSchema } from '@modules/companies/schemas/compliance.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('catalogs.internal-addresses');

const VALID_TYPES: InternalAddressType[] = [
	'mailing',
	'ein_request',
	'virtual_address',
	'other',
];

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const context = await requireAuthenticated(request, cookies);
	if ('error' in context) return context.error;

	try {
		const typeRaw = url.searchParams.get('type');
		const type = VALID_TYPES.includes(typeRaw as InternalAddressType)
			? (typeRaw as InternalAddressType)
			: null;
		const includeInactive = url.searchParams.get('includeInactive') === 'true';

		const rows = await listInternalAddresses(context.supabase, {
			type,
			includeInactive,
		});
		return json(200, { ok: true, data: rows });
	} catch (error) {
		log.error('list', { error });
		return json(500, { ok: false, error: 'INTERNAL_ERROR' });
	}
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	const parsed = internalAddressSchema.safeParse(body);
	if (!parsed.success) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const row = await createInternalAddress(
			context.supabase,
			parsed.data,
			context.user.id,
		);
		return json(200, { ok: true, data: row });
	} catch (error) {
		log.error('create', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.endsWith('_REQUIRED') ? 400 : 500;
		return json(status, { ok: false, error: message });
	}
};
