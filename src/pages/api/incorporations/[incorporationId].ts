import type { APIRoute } from 'astro';
import { updateIncorporationDetails } from '@domains/companies/incorporation-details';
import {
	json,
	requireCompanyDataManager,
} from '@shared/api/company-data';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('incorporations.update');

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const incorporation = await updateIncorporationDetails(
			context.supabase,
			incorporationId,
			body,
			context.user.id,
		);

		return json(200, { ok: true, data: incorporation });
	} catch (error) {
		log.error('update', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'INCORPORATION_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
