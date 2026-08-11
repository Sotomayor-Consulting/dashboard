export const prerender = false;

import type { APIRoute } from 'astro';
import {
	type DocumentRelatedType,
	DocumentsError,
	createDocumentRequest,
	resolveDocumentActor,
} from '@domains/documents';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('documents.request');

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

/**
 * Estados admisibles al CREAR una solicitud. El resto del ciclo de vida
 * ('uploaded', 'approved', 'rejected', 'cancelled') lo controla el servidor,
 * no el formulario: antes se aceptaba cualquier cadena y se insertaba tal
 * cual, de modo que un POST podía crear una solicitud ya aprobada.
 */
const CREATABLE_STATUSES = new Set(['pending', 'sent']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Margen razonable para una fecha límite; evita erratas tipo año 22026. */
const MAX_DUE_DATE_YEARS = 5;

/**
 * Valida la fecha límite: formato ISO, fecha real y dentro de un rango
 * razonable. Devuelve el mensaje de error, o null si es válida.
 */
function validateDueDate(value: string | null): string | null {
	if (!value) return null;

	if (!ISO_DATE.test(value)) {
		return 'La fecha límite debe tener formato AAAA-MM-DD';
	}

	const parsed = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) {
		return 'La fecha límite no es una fecha válida';
	}

	// Comparación en UTC contra el inicio del día de hoy.
	const today = new Date();
	const todayUtc = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate(),
	);
	if (parsed.getTime() < todayUtc) {
		return 'La fecha límite no puede estar en el pasado';
	}

	const maxDate = Date.UTC(
		today.getUTCFullYear() + MAX_DUE_DATE_YEARS,
		today.getUTCMonth(),
		today.getUTCDate(),
	);
	if (parsed.getTime() > maxDate) {
		return `La fecha límite no puede superar los ${MAX_DUE_DATE_YEARS} años`;
	}

	return null;
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
	const back =
		backParam ??
		`/incorporation/${incorporationCaseId ?? relatedToId}/documents`;

	const redirectWithStatus = (status: 'success' | 'error', msg: string) =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	if (!relatedToId) {
		return redirectWithStatus('error', 'Falta relatedToId');
	}

	const documentTypeIdRaw =
		(
			url.searchParams.get('documentTypeId') ||
			(form.get('documentTypeId') as string | null) ||
			''
		).trim() || null;
	const dueDate =
		(
			url.searchParams.get('dueDate') ||
			(form.get('dueDate') as string | null) ||
			''
		).trim() || null;
	const message =
		(
			url.searchParams.get('message') ||
			(form.get('message') as string | null) ||
			''
		).trim() || null;
	// Ojo: `requestStatus` se lee del campo `requestStatus`, no de `status`.
	// `status` es el parámetro que usa la propia redirección de resultado
	// (`?status=success`), y compartir el nombre hacía que el estado de la
	// solicitud pudiera contaminarse con el de la respuesta anterior.
	const requestStatusRaw =
		(
			url.searchParams.get('requestStatus') ||
			(form.get('requestStatus') as string | null) ||
			''
		).trim() || 'sent';
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

	if (!CREATABLE_STATUSES.has(requestStatusRaw)) {
		return redirectWithStatus('error', 'Estado de solicitud invalido');
	}

	const dueDateError = validateDueDate(dueDate);
	if (dueDateError) {
		return redirectWithStatus('error', dueDateError);
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
			status: requestStatusRaw,
		});

		return redirectWithStatus('success', 'Solicitud creada correctamente');
	} catch (error) {
		if (error instanceof DocumentsError) {
			return redirectWithStatus('error', error.message);
		}

		log.error('Unexpected error', { error });
		return redirectWithStatus('error', 'Error inesperado');
	}
};
