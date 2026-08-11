export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	cancelDocumentRequest,
	resolveDocumentActor,
	toJsonErrorResponse,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const actor = await resolveDocumentActor(supabase, locals.userRoles || []);

		const body = await request.json().catch(() => null);
		const documentRequestId = body?.documentRequestId as string | undefined;

		if (!documentRequestId) {
			throw new DocumentsError(400, 'Falta documentRequestId');
		}

		const result = await cancelDocumentRequest(actor, documentRequestId);

		return new Response(JSON.stringify({ ok: true, ...result }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
