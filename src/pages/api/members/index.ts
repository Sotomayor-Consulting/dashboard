import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { searchMembers } from '@domains/members/people';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('members.search');

/**
 * `GET /api/members?q=...` — búsqueda de personas para el combobox
 * "Persona" del flujo de agregar miembro. Devuelve hasta 20 resultados.
 *
 * NOTA: la creación de personas (`POST`) fue eliminada deliberadamente. Por
 * regla de producto una persona no puede existir sin estar vinculada al
 * menos a una empresa, así que el alta se hace siempre vía
 * `POST /api/companies/[companyId]/members` con `{ new_person: {...} }`.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const query = url.searchParams.get('q') ?? '';
	const limitRaw = url.searchParams.get('limit');
	const limit = limitRaw ? Number(limitRaw) : 20;

	try {
		const data = await searchMembers(context.supabase, {
			query,
			limit: Number.isFinite(limit) ? limit : 20,
		});
		return json(200, { ok: true, data });
	} catch (error) {
		log.error('search', { error });
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
