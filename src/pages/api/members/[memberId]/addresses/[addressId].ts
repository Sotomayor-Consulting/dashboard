import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	deleteMemberAddress,
	updateMemberAddress,
	type MemberAddressInput,
} from '@domains/members/member-addresses';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('members.addresses');

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateMemberId = (raw: string | undefined) => {
	if (!raw) return null;
	const trimmed = raw.trim();
	return UUID_RE.test(trimmed) ? trimmed : null;
};

const parseAddressId = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const memberId = validateMemberId(params.memberId);
	const addressId = parseAddressId(params.addressId);
	if (!memberId) return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });
	if (!addressId) return json(400, { ok: false, error: 'INVALID_ADDRESS_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as
		| MemberAddressInput
		| null;
	if (!body) return json(400, { ok: false, error: 'INVALID_BODY' });

	try {
		const address = await updateMemberAddress(
			context.supabase,
			memberId,
			addressId,
			body,
			context.user.id,
		);
		return json(200, { ok: true, data: address });
	} catch (error) {
		log.error('update', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.includes('NOT_FOUND')
			? 404
			: message === 'ADDRESS_LINE1_REQUIRED' || message === 'ADDRESS_TYPE_INVALID'
				? 400
				: 500;
		return json(status, { ok: false, error: message });
	}
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
	const memberId = validateMemberId(params.memberId);
	const addressId = parseAddressId(params.addressId);
	if (!memberId) return json(400, { ok: false, error: 'INVALID_MEMBER_ID' });
	if (!addressId) return json(400, { ok: false, error: 'INVALID_ADDRESS_ID' });

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	try {
		const address = await deleteMemberAddress(
			context.supabase,
			memberId,
			addressId,
			context.user.id,
		);
		return json(200, { ok: true, data: address });
	} catch (error) {
		log.error('delete', { error });
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.includes('NOT_FOUND') ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
