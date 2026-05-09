export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	resolveDocumentActor,
	revokeDocumentShare,
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
		const documentId = body?.documentId as string | undefined;
		const sharedWithUserId = body?.sharedWithUserId as string | undefined;

		if (!documentId) {
			throw new DocumentsError(400, 'Falta documentId');
		}

		const result = await revokeDocumentShare(
			actor,
			documentId,
			sharedWithUserId,
		);

		return new Response(
			JSON.stringify({
				ok: true,
				documentId,
				caseId: result.caseId,
				revokedCount: result.revokedCount,
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
