export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { json } from '@shared/api/company-data';
import {
	getIncorporationForm,
	saveIncorporationFormDraft,
} from '@domains/workflow/incorporation-forms';
import { isDraftPayloadShape } from '@modules/companies/stages/client-form/payload';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('incorporations.form');

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
		},
	});
};

interface DraftBody {
	payload?: unknown;
	progress?: number;
	currentStep?: string | null;
}

/** PATCH — autosave del borrador (write-through del wizard). */
export const PATCH: APIRoute = async ({ request, cookies, params }) => {
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

	const progress =
		typeof body.progress === 'number'
			? Math.min(100, Math.max(0, Math.round(body.progress)))
			: 0;
	const currentStep =
		typeof body.currentStep === 'string' ? body.currentStep : null;

	const result = await saveIncorporationFormDraft(supabase, {
		incorporationId,
		userId: user.id,
		payload: body.payload,
		progressPercent: progress,
		currentStep,
	});

	if (!result.ok) {
		log.error('draft save failed', { incorporationId, reason: result.reason });
		return json(500, { ok: false, error: 'DRAFT_SAVE_FAILED' });
	}

	return json(200, { ok: true, status: result.status });
};
