export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	resolveDocumentActor,
	toJsonErrorResponse,
	updateDocumentReviewStatus,
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
		const documentId = body?.documentId as string | undefined;
		const status = body?.status as string | undefined;
		const comments = body?.comments as string | undefined;

		if (!documentId) {
			throw new DocumentsError(400, 'Falta documentId');
		}

		if (status !== 'approved' && status !== 'rejected') {
			throw new DocumentsError(400, 'status invalido');
		}

		const result = await updateDocumentReviewStatus(
			actor,
			documentId,
			status,
			comments,
		);

		return new Response(
			JSON.stringify({
				ok: true,
				documentId: result.documentId,
				status: result.status,
				caseId: result.caseId,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
