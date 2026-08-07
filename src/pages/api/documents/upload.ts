export const prerender = false;

import type { APIRoute } from 'astro';
import {
	type DocumentRelatedType,
	DocumentsError,
	resolveDocumentActor,
	uploadDocument,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { checkRateLimit } from '@infrastructure/security/rate-limit';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('documents.upload');

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
	const back = backParam ?? `/documentos/${incorporationCaseId ?? relatedToId}`;

	const redirectWithStatus = (
		status: 'success' | 'error',
		msg: string,
	): Response =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	if (!relatedToId) {
		return redirectWithStatus('error', 'Falta relatedToId');
	}

	// Anti-abuso de storage: tope de subidas por usuario autenticado
	const rlKey = `docs-upload:${locals.user?.id ?? 'anon'}`;
	if (!checkRateLimit(rlKey, 20, 60_000)) {
		return redirectWithStatus(
			'error',
			'Demasiadas subidas seguidas. Espera un minuto e intenta de nuevo.',
		);
	}

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const userRoles = locals.userRoles || [];
		const actor = await resolveDocumentActor(supabase, userRoles);

		const file = form.get('file') as File | null;
		const visibilityRaw =
			(
				url.searchParams.get('visibility') ||
				(form.get('visibility') as string | null) ||
				''
			).trim() || null;
		const visibility = actor.isStaff
			? visibilityRaw === 'client_visible'
				? 'client_visible'
				: 'internal_only'
			: 'client_visible';
		const documentTypeIdRaw =
			(
				url.searchParams.get('documentTypeId') ||
				(form.get('documentTypeId') as string | null) ||
				''
			).trim() || null;
		const documentTypeId = documentTypeIdRaw
			? Number.parseInt(documentTypeIdRaw, 10)
			: null;
		if (documentTypeIdRaw && !Number.isInteger(documentTypeId)) {
			return redirectWithStatus('error', 'documentTypeId invalido');
		}

		const documentRequestId =
			url.searchParams.get('documentRequestId') ||
			(form.get('documentRequestId') as string | null);
		const shouldAutoShare =
			(url.searchParams.get('shareWithClient') ||
				(form.get('shareWithClient') as string | null) ||
				'true') !== 'false';
		const shareWithUserId =
			url.searchParams.get('shareWithUserId') ||
			(form.get('shareWithUserId') as string | null);
		const isSigned =
			(url.searchParams.get('isSigned') ||
				(form.get('isSigned') as string | null) ||
				'') === 'true';

		if (!actor.isStaff && !documentRequestId) {
			return redirectWithStatus('error', 'Falta documentRequestId');
		}

		if (!file) {
			return redirectWithStatus('error', 'Archivo obligatorio');
		}

		await uploadDocument(actor, {
			file,
			documentTypeId,
			documentRequestId,
			relatedToType,
			relatedToId,
			caseId: caseIdParam,
			visibility,
			autoShare: shouldAutoShare,
			shareWithUserId,
			isSigned,
		});

		return redirectWithStatus('success', 'Documento subido correctamente');
	} catch (error) {
		if (error instanceof DocumentsError) {
			return redirectWithStatus('error', error.message);
		}

		log.error('Unexpected error', { error });
		return new Response('Error inesperado', { status: 500 });
	}
};
