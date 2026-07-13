import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	getMemberById,
	updateMember,
	type MemberInput,
} from '@domains/members/people';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('members.member');

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateMemberId = (raw: string | undefined) => {
	if (!raw) return null;
	const trimmed = raw.trim();
	return UUID_RE.test(trimmed) ? trimmed : null;
};

export const GET: APIRoute = async ({ request, cookies, params }) => {
	const memberId = validateMemberId(params.memberId);
	if (!memberId) {
		return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	try {
		const member = await getMemberById(context.supabase, memberId);
		if (!member) return json(404, { ok: false, error: 'MEMBER_NOT_FOUND' });
		return json(200, { ok: true, data: member });
	} catch (error) {
		log.error('get', { error });
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const memberId = validateMemberId(params.memberId);
	if (!memberId) {
		return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as MemberInput | null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const member = await updateMember(
			context.supabase,
			memberId,
			body,
			context.user.id,
		);
		return json(200, { ok: true, data: member });
	} catch (error) {
		log.error('update', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status =
			message === 'MEMBER_NOT_FOUND'
				? 404
				: message === 'MEMBER_FULL_NAME_REQUIRED'
					? 400
					: 500;
		return json(status, { ok: false, error: message });
	}
};
