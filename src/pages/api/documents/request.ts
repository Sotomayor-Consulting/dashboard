export const prerender = false;

import type { APIRoute } from 'astro';
import {
	type DocumentRelatedType,
	DocumentsError,
	createDocumentRequest,
	resolveDocumentActor,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';

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

export const POST: APIRoute = async ({
	request,
	cookies,
	redirect,
	url,
	locals,
}) => {
	const form = await request.formData();

	const incorporationCaseId =
		url.searchParams.get('incorporationCaseId') ||
		(form.get('incorporationCaseId') as string | null);
	const relatedToType = parseRelatedType(
		url.searchParams.get('relatedToType') ||
			(form.get('relatedToType') as string | null),
	);
	const relatedToId =
		url.searchParams.get('relatedToId') ||
		(form.get('relatedToId') as string | null) ||
		incorporationCaseId ||
		'';
	const caseIdParam =
		url.searchParams.get('caseId') ||
		(form.get('caseId') as string | null) ||
		incorporationCaseId ||
		null;

	const backParam =
		url.searchParams.get('back') || (form.get('back') as string | null);
	const back = backParam ?? `/incorporations/${incorporationCaseId ?? relatedToId}`;

	const redirectWithStatus = (status: 'success' | 'error', msg: string) =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	if (!relatedToId) {
		return redirectWithStatus('error', 'Falta relatedToId');
	}

	const documentTypeIdRaw =
		(url.searchParams.get('documentTypeId') ||
			(form.get('documentTypeId') as string | null) ||
			'').trim() || null;
	const dueDate =
		(url.searchParams.get('dueDate') ||
			(form.get('dueDate') as string | null) ||
			'').trim() || null;
	const message =
		(url.searchParams.get('message') ||
			(form.get('message') as string | null) ||
			'').trim() || null;
	const status =
		(url.searchParams.get('status') ||
			(form.get('status') as string | null) ||
			'').trim() || 'sent';
	const isRequired =
		(url.searchParams.get('isRequired') ||
			(form.get('isRequired') as string | null) ||
			'true') !== 'false';

	const documentTypeId = documentTypeIdRaw
		? Number.parseInt(documentTypeIdRaw, 10)
		: NaN;

	if (!Number.isInteger(documentTypeId)) {
		return redirectWithStatus('error', 'documentTypeId invalido');
	}

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const actor = await resolveDocumentActor(supabase, locals.userRoles || []);

		await createDocumentRequest(actor, {
			documentTypeId,
			relatedToType,
			relatedToId,
			caseId: caseIdParam,
			dueDate,
			message,
			isRequired,
			status,
		});

		return redirectWithStatus('success', 'Solicitud creada correctamente');
	} catch (error) {
		if (error instanceof DocumentsError) {
			return redirectWithStatus('error', error.message);
		}

		console.error('[documents/request] Unexpected error:', error);
		return redirectWithStatus('error', 'Error inesperado');
	}
};
