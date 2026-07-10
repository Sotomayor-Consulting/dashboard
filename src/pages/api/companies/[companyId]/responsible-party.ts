import type { APIRoute } from 'astro';
import {
	designateResponsibleParty,
	endResponsibleParty,
	getCurrentResponsibleParty,
	listResponsiblePartyHistory,
} from '@domains/companies/responsible-party';
import {
	json,
	requireAuthenticated,
	requireCompanyDataManager,
} from '@shared/api/company-data';
import {
	designateResponsiblePartySchema,
	terminateVigencySchema,
} from '@modules/companies/schemas/compliance.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.responsible-party');

const parseCompanyId = (raw: string | undefined) => raw?.trim() || null;

const errorStatus = (message: string) =>
	message === 'RESPONSIBLE_PARTY_NOT_FOUND' ||
	message === 'MEMBER_NOT_IN_COMPANY'
		? 404
		: message === 'MEMBER_ALREADY_RESPONSIBLE_PARTY'
			? 409
			: 500;

export const GET: APIRoute = async ({ request, cookies, params, url }) => {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) return json(400, { ok: false, error: 'MISSING_COMPANY_ID' });

	const context = await requireAuthenticated(request, cookies);
	if ('error' in context) return context.error;

	try {
		const includeHistory = url.searchParams.get('history') === 'true';
		const current = await getCurrentResponsibleParty(
			context.supabase,
			companyId,
		);
		const history = includeHistory
			? await listResponsiblePartyHistory(context.supabase, companyId)
			: undefined;
		return json(200, { ok: true, data: { current, history } });
	} catch (error) {
		log.error('get', { error });
		return json(500, { ok: false, error: 'INTERNAL_ERROR' });
	}
};

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) return json(400, { ok: false, error: 'MISSING_COMPANY_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	const parsed = designateResponsiblePartySchema.safeParse(body);
	if (!parsed.success) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const designated = await designateResponsibleParty(
			context.supabase,
			companyId,
			parsed.data.member_id,
			parsed.data.title ?? null,
			context.user.id,
			parsed.data.start_date ?? null,
		);
		return json(200, { ok: true, data: designated });
	} catch (error) {
		log.error('designate', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		return json(errorStatus(message), { ok: false, error: message });
	}
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) return json(400, { ok: false, error: 'MISSING_COMPANY_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => ({}));
	const parsed = terminateVigencySchema.safeParse(body ?? {});
	if (!parsed.success) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const closed = await endResponsibleParty(
			context.supabase,
			companyId,
			context.user.id,
			parsed.data.end_date ?? null,
		);
		return json(200, { ok: true, data: closed });
	} catch (error) {
		log.error('end', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		return json(errorStatus(message), { ok: false, error: message });
	}
};
