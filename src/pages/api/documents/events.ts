export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	listDocumentEvents,
	resolveDocumentActor,
	toJsonErrorResponse,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';

export const GET: APIRoute = async ({ request, cookies, url, locals }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const actor = await resolveDocumentActor(supabase, locals.userRoles || []);

		const documentId = url.searchParams.get('documentId')?.trim() || '';
		if (!documentId) {
			throw new DocumentsError(400, 'Falta documentId');
		}

		const events = await listDocumentEvents(actor, documentId);
		return new Response(JSON.stringify({ events }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
