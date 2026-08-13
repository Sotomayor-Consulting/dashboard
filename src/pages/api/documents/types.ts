export const prerender = false;

import type { APIRoute } from 'astro';
import {
	DOCUMENT_APPLIES_TO,
	type DocumentAppliesTo,
	DocumentsError,
	listDocumentTypes,
	resolveDocumentActor,
	toJsonErrorResponse,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';

const ALLOWED = new Set<string>(DOCUMENT_APPLIES_TO);

export const GET: APIRoute = async ({ request, cookies, url, locals }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		// Solo autentica: el catálogo no expone datos de ningún cliente.
		await resolveDocumentActor(supabase, locals.userRoles || []);

		const appliesTo = (url.searchParams.get('appliesTo') || '')
			.split(',')
			.map((value) => value.trim())
			.filter((value) => ALLOWED.has(value)) as DocumentAppliesTo[];

		if (appliesTo.length === 0) {
			throw new DocumentsError(400, 'Falta appliesTo');
		}

		const types = await listDocumentTypes(appliesTo);

		return new Response(JSON.stringify({ types }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return toJsonErrorResponse(error);
	}
};
