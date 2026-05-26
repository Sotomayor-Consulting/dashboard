import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	createMemberAddress,
	listMemberAddresses,
	type MemberAddressInput,
} from '@domains/members/member-addresses';

export const prerender = false;

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateMemberId = (raw: string | undefined) => {
	if (!raw) return null;
	const trimmed = raw.trim();
	return UUID_RE.test(trimmed) ? trimmed : null;
};

export const GET: APIRoute = async ({ request, cookies, params }) => {
	const memberId = validateMemberId(params.memberId);
	if (!memberId) return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	try {
		const data = await listMemberAddresses(context.supabase, memberId);
		return json(200, { ok: true, data });
	} catch (error) {
		console.error('[member_addresses:list]', error);
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message === 'MEMBER_NOT_FOUND' ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const memberId = validateMemberId(params.memberId);
	if (!memberId) return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as
		| MemberAddressInput
		| null;
	if (!body) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const address = await createMemberAddress(
			context.supabase,
			memberId,
			body,
			context.user.id,
		);
		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[member_addresses:create]', error);
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status =
			message === 'MEMBER_NOT_FOUND'
				? 404
				: message === 'ADDRESS_LINE1_REQUIRED' ||
					  message === 'ADDRESS_TYPE_INVALID'
					? 400
					: 500;
		return json(status, { ok: false, error: message });
	}
};
