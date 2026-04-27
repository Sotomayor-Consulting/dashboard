export const prerender = false;

import type { APIRoute } from 'astro';
import {
	type DocumentRelatedType,
	DocumentsError,
	listDocumentsByContext,
	resolveDocumentActor,
	toJsonErrorResponse,
} from '@lib/documents';
import { createSupabaseServerClient } from '@lib/supabase';

const ALLOWED_RELATED_TYPES = new Set<DocumentRelatedType>([
	'user',
	'profile',
	'member',
	'company',
	'incorporation_case',
	'workflow',
	'task',
	'stage',
]);

function parseRelatedType(value: string | null): DocumentRelatedType {
	const fallback = 'incorporation_case';
	if (!value) return fallback;
	if (ALLOWED_RELATED_TYPES.has(value as DocumentRelatedType)) {
		return value as DocumentRelatedType;
	}
	return fallback;
}

export const GET: APIRoute = async ({ request, cookies, url, locals }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const actor = await resolveDocumentActor(supabase, locals.userRoles || []);

		const relatedToType = parseRelatedType(
			url.searchParams.get('relatedToType') || url.searchParams.get('type'),
		);
		const relatedToId =
			url.searchParams.get('relatedToId') ||
			url.searchParams.get('id') ||
			url.searchParams.get('incorporationCaseId') ||
			'';

		if (!relatedToId) {
			throw new DocumentsError(400, 'Falta relatedToId');
		}

		const payload = await listDocumentsByContext(
			actor,
			relatedToType,
			relatedToId,
		);

		return new Response(
			JSON.stringify({
				related_to_type: relatedToType,
				related_to_id: relatedToId,
				...payload,
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
