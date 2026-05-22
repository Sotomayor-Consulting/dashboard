import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import {
	softDeleteCompanyMemberAddress,
	updateCompanyMemberAddress,
	type CompanyMemberAddressInput,
} from '@domains/companies/company-members';

export const prerender = false;

const parsePositiveInt = (raw: string | undefined) => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function resolveContext({
	request,
	cookies,
	params,
}: Parameters<APIRoute>[0]) {
	const incorporationId = params.incorporationId?.trim();
	const memberId = parsePositiveInt(params.memberId);
	const addressId = parsePositiveInt(params.addressId);

	if (!incorporationId) {
		return { error: json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' }) };
	}
	if (!memberId) {
		return { error: json(400, { ok: false, error: 'INVALID_MEMBER_ID' }) };
	}
	if (!addressId) {
		return { error: json(400, { ok: false, error: 'INVALID_ADDRESS_ID' }) };
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return { error: context.error };

	const companyId = await getCompanyIdForIncorporation(
		context.supabase,
		incorporationId,
	);
	if (!companyId) {
		return { error: json(409, { ok: false, error: 'COMPANY_NOT_CREATED' }) };
	}

	return {
		supabase: context.supabase,
		user: context.user,
		companyId,
		memberId,
		addressId,
	};
}

export const PATCH: APIRoute = async (context) => {
	try {
		const resolved = await resolveContext(context);
		if ('error' in resolved) return resolved.error;

		const body = (await context.request.json().catch(() => null)) as
			| CompanyMemberAddressInput
			| null;
		if (!body) {
			return json(400, { ok: false, error: 'INVALID_BODY' });
		}

		const address = await updateCompanyMemberAddress(
			resolved.supabase,
			resolved.companyId,
			resolved.memberId,
			resolved.addressId,
			body,
			resolved.user.id,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[company_member_addresses:update]', error);
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.includes('NOT_FOUND') ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};

export const DELETE: APIRoute = async (context) => {
	try {
		const resolved = await resolveContext(context);
		if ('error' in resolved) return resolved.error;

		const body = (await context.request.json().catch(() => null)) as
			| { reason?: string }
			| null;
		const address = await softDeleteCompanyMemberAddress(
			resolved.supabase,
			resolved.companyId,
			resolved.memberId,
			resolved.addressId,
			resolved.user.id,
			body?.reason ?? null,
		);

		return json(200, { ok: true, data: address });
	} catch (error) {
		console.error('[company_member_addresses:delete]', error);
		const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
		const status = message.includes('NOT_FOUND') ? 404 : 500;
		return json(status, { ok: false, error: message });
	}
};
