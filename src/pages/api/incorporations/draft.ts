export const prerender = false;

import type { APIRoute } from 'astro';
import {
	clearIncorporationDraftCookie,
	normalizeIncorporationDraft,
	readIncorporationDraftCookie,
	writeIncorporationDraftCookie,
} from '@shared/incorporation-draft';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const GET: APIRoute = async ({ cookies, locals }) => {
	return json(200, {
		ok: true,
		data: {
			draft: readIncorporationDraftCookie(cookies),
			isAuthenticated: Boolean(locals.user),
		},
	});
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;

	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	const currentDraft = readIncorporationDraftCookie(cookies);
	const nextDraft = normalizeIncorporationDraft({
		...currentDraft,
		...body,
	});

	writeIncorporationDraftCookie(cookies, nextDraft);

	return json(200, { ok: true, data: { draft: nextDraft } });
};

export const DELETE: APIRoute = async ({ cookies }) => {
	clearIncorporationDraftCookie(cookies);
	return json(200, { ok: true });
};
