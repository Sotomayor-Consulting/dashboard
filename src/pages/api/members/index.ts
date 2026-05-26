import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	createMember,
	searchMembers,
	type MemberInput,
} from '@domains/members/people';

export const prerender = false;

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
		console.error('[members:search]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as MemberInput | null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const member = await createMember(context.supabase, body, context.user.id);
		return json(200, { ok: true, data: member });
	} catch (error) {
		console.error('[members:create]', error);
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'MEMBER_FULL_NAME_REQUIRED' ? 400 : 500;
		return json(status, { ok: false, error: message });
	}
};
