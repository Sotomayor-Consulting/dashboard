export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DocumentsError,
	resolveDocumentActor,
	setDocumentArchived,
	toJsonErrorResponse,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';

/**
 * Archiva o desarchiva un documento. Reversible: la fila, el archivo y la
 * bitácora se conservan. Para el borrado permanente, ver ./delete.
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
		const archived = body?.archived;

		if (!documentId) {
			throw new DocumentsError(400, 'Falta documentId');
		}

		if (typeof archived !== 'boolean') {
			throw new DocumentsError(400, 'Falta el indicador `archived`');
		}

		const result = await setDocumentArchived(actor, documentId, archived);

		return new Response(JSON.stringify({ ok: true, ...result }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
