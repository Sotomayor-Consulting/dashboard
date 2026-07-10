import type { APIRoute } from 'astro';
import {
	listMemberTaxIdentifications,
	upsertMemberTaxIdentification,
} from '@domains/members/tax-identifications';
import {
	json,
	requireAuthenticated,
	requireCompanyDataManager,
} from '@shared/api/company-data';
import { memberTaxIdentificationSchema } from '@modules/companies/schemas/compliance.schema';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('members.tax-identifications');

const parseMemberId = (raw: string | undefined) => raw?.trim() || null;

export const GET: APIRoute = async ({ request, cookies, params, url }) => {
	const memberId = parseMemberId(params.memberId);
	if (!memberId) return json(400, { ok: false, error: 'MISSING_MEMBER_ID' });

	const context = await requireAuthenticated(request, cookies);
	if ('error' in context) return context.error;

	try {
		const includeInactive = url.searchParams.get('includeInactive') === 'true';
		const rows = await listMemberTaxIdentifications(
			context.supabase,
			memberId,
			{
				includeInactive,
			},
		);
		return json(200, { ok: true, data: rows });
	} catch (error) {
		log.error('list', { error });
		return json(500, { ok: false, error: 'INTERNAL_ERROR' });
	}
};

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const memberId = parseMemberId(params.memberId);
	if (!memberId) return json(400, { ok: false, error: 'MISSING_MEMBER_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = await request.json().catch(() => null);
	const parsed = memberTaxIdentificationSchema.safeParse(body);
	if (!parsed.success) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const row = await upsertMemberTaxIdentification(
			context.supabase,
			memberId,
			parsed.data,
			context.user.id,
		);
		return json(200, { ok: true, data: row });
	} catch (error) {
		log.error('upsert', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.endsWith('_REQUIRED') ? 400 : 500;
		return json(status, { ok: false, error: message });
	}
};
