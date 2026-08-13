export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	type SignedUrlMode,
	createDocumentSignedUrl,
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
		const documentId = body?.documentId as string | undefined;
		if (!documentId) {
			throw new DocumentsError(400, 'Falta documentId');
		}

		// Sin `mode` se descarga: es lo que hacían todos los llamadores previos.
		const mode: SignedUrlMode =
			body?.mode === 'preview' ? 'preview' : 'download';

		const signedUrl = await createDocumentSignedUrl(actor, documentId, mode);
		return new Response(JSON.stringify({ signedUrl }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
