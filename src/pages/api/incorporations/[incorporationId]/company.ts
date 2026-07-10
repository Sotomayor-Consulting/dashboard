import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import type { CompanyUpdate } from '@domains/companies/types/company';
import {
	createCompanyFromIncorporation,
	updateCompanyForIncorporation,
} from '@domains/companies/company-records';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('incorporations.company');

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	try {
		const companyId = await createCompanyFromIncorporation(
			context.supabase,
			incorporationId,
			context.user.id,
			'draft',
		);

		return json(200, { ok: true, data: { company_id: companyId } });
	} catch (error) {
		log.error('create-from-incorporation', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status =
			message === 'INCORPORATION_NOT_FOUND'
				? 404
				: message === 'FORBIDDEN'
					? 403
					: message === 'COMPANY_NOT_CREATED'
						? 409
						: 500;

		return json(status, {
			ok: false,
			error: message,
		});
	}
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request
		.json()
		.catch(() => null)) as CompanyUpdate | null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const company = await updateCompanyForIncorporation(
			context.supabase,
			incorporationId,
			body,
			context.user.id,
		);

		return json(200, { ok: true, data: company });
	} catch (error) {
		log.error('update', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'COMPANY_NOT_CREATED' ? 409 : 500;
		return json(status, { ok: false, error: message });
	}
};
