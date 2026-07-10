import type { APIRoute } from 'astro';
import {
	createRegisteredAgent,
	createRegisteredAgentProvider,
	listRegisteredAgentProviders,
	listRegisteredAgents,
} from '@domains/catalogs/registered-agents';
import {
	json,
	requireAuthenticated,
	requireCompanyDataManager,
} from '@shared/api/company-data';
import {
	registeredAgentCatalogSchema,
	registeredAgentProviderSchema,
} from '@modules/companies/schemas/compliance.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('catalogs.registered-agents');

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const context = await requireAuthenticated(request, cookies);
	if ('error' in context) return context.error;

	try {
		const stateIdRaw = url.searchParams.get('state_id');
		const stateId = stateIdRaw ? Number(stateIdRaw) : null;
		const includeInactive = url.searchParams.get('includeInactive') === 'true';

		const [providers, agents] = await Promise.all([
			listRegisteredAgentProviders(context.supabase, { includeInactive }),
			listRegisteredAgents(context.supabase, {
				stateId: Number.isInteger(stateId) ? stateId : null,
				includeInactive,
			}),
		]);
		return json(200, { ok: true, data: { providers, agents } });
	} catch (error) {
		log.error('list', { error });
		return json(500, { ok: false, error: 'INTERNAL_ERROR' });
	}
};

/** Crea proveedor ({ provider: {...} }) o agente ({ agent: {...} }) — staff only. */
export const POST: APIRoute = async ({ request, cookies }) => {
	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		if ('provider' in body) {
			const parsed = registeredAgentProviderSchema.safeParse(body.provider);
			if (!parsed.success)
				return json(400, { ok: false, error: 'INVALID_BODY' });
			const provider = await createRegisteredAgentProvider(
				context.supabase,
				parsed.data,
				context.user.id,
			);
			return json(200, { ok: true, data: provider });
		}

		if ('agent' in body) {
			const parsed = registeredAgentCatalogSchema.safeParse(body.agent);
			if (!parsed.success)
				return json(400, { ok: false, error: 'INVALID_BODY' });
			const agent = await createRegisteredAgent(
				context.supabase,
				parsed.data,
				context.user.id,
			);
			return json(200, { ok: true, data: agent });
		}

		return json(400, { ok: false, error: 'INVALID_BODY' });
	} catch (error) {
		log.error('create', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.endsWith('_REQUIRED') ? 400 : 500;
		return json(status, { ok: false, error: message });
	}
};
