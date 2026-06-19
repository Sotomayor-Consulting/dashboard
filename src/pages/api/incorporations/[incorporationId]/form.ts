export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { json } from '@shared/api/company-data';
import {
	getIncorporationForm,
	getIncorporationOwner,
	saveIncorporationFormDraft,
} from '@domains/workflow/incorporation-forms';
import { isDraftPayloadShape } from '@modules/companies/stages/client-form/payload';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('incorporations.form');

/**
 * Recorre recursivamente un objeto buscando strings que parezcan paths de
 * Storage (contienen `/incorporations/`). Devuelve todos los encontrados junto
 * con la clave JSON en la que aparecen. Opera sobre `unknown`, así que es
 * seguro para payloads parciales / drafts incompletos.
 */
function collectPathStrings(
	obj: unknown,
	keyPath = '',
): { key: string; value: string }[] {
	if (!obj || typeof obj !== 'object') return [];
	const results: { key: string; value: string }[] = [];
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		const fullKey = keyPath ? `${keyPath}.${k}` : k;
		if (typeof v === 'string' && v.includes('/incorporations/')) {
			results.push({ key: fullKey, value: v });
		} else if (v && typeof v === 'object') {
			results.push(...collectPathStrings(v, fullKey));
		}
	}
	return results;
}

/** GET — carga el borrador actual (payload + estado) para rehidratar el wizard. */
export const GET: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	// RLS (user_can_access_incorporation) restringe la fila al dueño/staff.
	const form = await getIncorporationForm(supabase, incorporationId);
	if (!form) {
		return json(200, { ok: true, data: null });
	}

	return json(200, {
		ok: true,
		data: {
			payload: form.payload,
			status: form.status,
			progress_percent: form.progress_percent,
			current_step: form.current_step,
			submitted_at: form.submitted_at,
			rejection_reason: form.rejection_reason,
			updated_at: form.updated_at,
		},
	});
};

interface DraftBody {
	payload?: unknown;
	progress?: number;
	currentStep?: string | null;
	expectedUpdatedAt?: string;
}

const MAX_DRAFT_BODY_BYTES = 256 * 1024; // 256 KB

/** PATCH — autosave del borrador (write-through del wizard). */
export const PATCH: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const contentLength = parseInt(
		request.headers.get('content-length') ?? '0',
		10,
	);
	if (contentLength > MAX_DRAFT_BODY_BYTES) {
		return json(413, { ok: false, error: 'BODY_TOO_LARGE' });
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	const body = (await request.json().catch(() => null)) as DraftBody | null;
	if (!body || typeof body.payload !== 'object' || body.payload === null) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	const shape = isDraftPayloadShape(body.payload);
	if (!shape.ok) {
		log.warn('draft rejected: malformed payload shape', {
			incorporationId,
			reason: shape.reason,
		});
		return json(422, { ok: false, error: 'INVALID_PAYLOAD_SHAPE', reason: shape.reason });
	}

	// Path ownership: cualquier string que parezca un path de Storage debe
	// pertenecer a este usuario + incorporación. Previene que un draft
	// malicioso referencie archivos de otro usuario.
	const owner = await getIncorporationOwner(supabase, incorporationId);
	if (!owner) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const expectedPrefix = `${owner.ownerId}/incorporations/${incorporationId}/`;
	const pathStrings = collectPathStrings(body.payload);
	const badPaths = pathStrings.filter((p) => !p.value.startsWith(expectedPrefix));
	if (badPaths.length > 0) {
		log.warn('draft path ownership violation', {
			incorporationId,
			userId: user.id,
			badPaths: badPaths.map((p) => p.key),
		});
		return json(403, {
			ok: false,
			error: 'PATH_OWNERSHIP',
			details: badPaths.map(
				(p) => `${p.key}: ruta no pertenece a esta incorporación.`,
			),
		});
	}

	const progress =
		typeof body.progress === 'number'
			? Math.min(100, Math.max(0, Math.round(body.progress)))
			: 0;
	const currentStep =
		typeof body.currentStep === 'string' ? body.currentStep : null;

	const expectedUpdatedAt =
		typeof body.expectedUpdatedAt === 'string'
			? body.expectedUpdatedAt
			: undefined;

	const result = await saveIncorporationFormDraft(supabase, {
		incorporationId,
		userId: user.id,
		payload: body.payload,
		progressPercent: progress,
		currentStep,
		...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
	});

	if (!result.ok) {
		if (result.reason === 'CONFLICT') {
			return json(409, { ok: false, error: 'CONFLICT', details: ['Otro dispositivo guardó cambios más recientes. Recarga la página.'] });
		}
		log.error('draft save failed', { incorporationId, reason: result.reason });
		return json(500, { ok: false, error: 'DRAFT_SAVE_FAILED' });
	}

	return json(200, { ok: true, status: result.status, updatedAt: result.updatedAt });
};
