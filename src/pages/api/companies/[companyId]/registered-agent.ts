import type { APIRoute } from 'astro';
import {
	assignCompanyRegisteredAgent,
	getCurrentCompanyRegisteredAgent,
	listCompanyRegisteredAgentHistory,
	terminateCompanyRegisteredAgent,
} from '@domains/companies/registered-agents';
import {
	json,
	requireAuthenticated,
	requireCompanyDataManager,
} from '@shared/api/company-data';
import {
	assignRegisteredAgentSchema,
	terminateVigencySchema,
} from '@modules/companies/schemas/compliance.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.registered-agent');

const parseCompanyId = (raw: string | undefined) => raw?.trim() || null;

const errorStatus = (message: string) =>
	message === 'REGISTERED_AGENT_NOT_FOUND' ||
	message === 'COMPANY_REGISTERED_AGENT_NOT_FOUND'
		? 404
		: message.endsWith('_REQUIRED')
			? 400
			: 500;

export const GET: APIRoute = async ({ request, cookies, params, url }) => {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) return json(400, { ok: false, error: 'MISSING_COMPANY_ID' });

	const context = await requireAuthenticated(request, cookies);
	if ('error' in context) return context.error;

	try {
		const includeHistory = url.searchParams.get('history') === 'true';
		const current = await getCurrentCompanyRegisteredAgent(
			context.supabase,
			companyId,
		);
		const history = includeHistory
			? await listCompanyRegisteredAgentHistory(context.supabase, companyId)
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
	const parsed = assignRegisteredAgentSchema.safeParse(body);
	if (!parsed.success) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const assignment = await assignCompanyRegisteredAgent(
			context.supabase,
			companyId,
			parsed.data,
			context.user.id,
		);
		return json(200, { ok: true, data: assignment });
	} catch (error) {
		log.error('assign', { error });
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
		const closed = await terminateCompanyRegisteredAgent(
			context.supabase,
			companyId,
			context.user.id,
			parsed.data.end_date ?? null,
		);
		return json(200, { ok: true, data: closed });
	} catch (error) {
		log.error('terminate', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		return json(errorStatus(message), { ok: false, error: message });
	}
};
