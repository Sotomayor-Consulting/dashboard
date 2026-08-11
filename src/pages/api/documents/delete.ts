export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	deleteDocument,
	resolveDocumentActor,
	toJsonErrorResponse,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';

/**
 * Borrado permanente: elimina la fila y el archivo del bucket.
 *
 * Irreversible y destruye la auditoría del documento (document_links,
 * document_shares y document_events cuelgan con ON DELETE CASCADE). Solo
 * admin; el servicio vuelve a comprobarlo. Para ocultar sin destruir, usar
 * ./archive.
 */
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

		const result = await deleteDocument(actor, documentId);

		return new Response(JSON.stringify({ ok: true, ...result }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
