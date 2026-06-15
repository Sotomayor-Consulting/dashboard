export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { json } from '@shared/api/company-data';
import {
	getIncorporationForm,
	getIncorporationOwner,
	isClientEditable,
	submitIncorporationForm,
} from '@domains/workflow/incorporation-forms';
import {
	type IncorporationFormPayloadV2,
	validateIncorporationFormPayload,
} from '@modules/companies/stages/client-form/payload';
import type { FileRef } from '@modules/companies/stages/client-form/types';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('incorporations.form.submit');

const BUCKET = 'documentos_empresas';

interface SubmitBody {
	payload?: IncorporationFormPayloadV2;
}

/** Sube la firma (dataURL PNG) a Storage y devuelve su FileRef. */
async function uploadFirma(
	ownerId: string,
	incorporationId: string,
	dataUrl: string,
): Promise<FileRef | null> {
	const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
	if (!match) return null;
	const [, mime, b64] = match;
	const ext =
		mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'png';
	const path = `${ownerId}/incorporations/${incorporationId}/firma/firma.${ext}`;
	const bytes = Buffer.from(b64!, 'base64');

	const { error } = await supabaseAdmin.storage
		.from(BUCKET)
		.upload(path, bytes, { contentType: mime ?? 'image/png', upsert: true });

	if (error) {
		log.error('firma upload failed', { incorporationId, error });
		return null;
	}
	return {
		path,
		name: `firma.${ext}`,
		mime: mime ?? 'image/png',
		size: bytes.byteLength,
	};
}

/**
 * POST — submit final del formulario. Valida integridad, sube la firma y marca
 * el staging como `submitted`. No promueve a tablas canónicas (eso lo hace
 * operaciones desde `validated_payload`).
 */
export const POST: APIRoute = async ({ request, cookies, params }) => {
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

	const owner = await getIncorporationOwner(supabase, incorporationId);
	if (!owner) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	// Guard temprano: si el formulario ya fue enviado/validado/promovido no se
	// reenvía. Se chequea ANTES de subir la firma para no sobrescribir el blob
	// de un formulario ya cerrado. (El guard atómico final vive en el dominio.)
	const existing = await getIncorporationForm(supabase, incorporationId);
	if (existing && !isClientEditable(existing.status)) {
		return json(409, {
			ok: false,
			error: 'ALREADY_SUBMITTED',
			status: existing.status,
			details: ['Este formulario ya fue enviado y no puede reenviarse.'],
		});
	}

	const body = (await request.json().catch(() => null)) as SubmitBody | null;
	const payload = body?.payload;
	if (!payload || typeof payload !== 'object') {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	const errors = validateIncorporationFormPayload(payload);
	if (errors.length > 0) {
		return json(422, { ok: false, error: 'VALIDATION', details: errors });
	}

	// Subir la firma si llega como dataURL; reemplazarla por su FileRef en Storage
	// para no almacenar el base64 pesado dentro del jsonb.
	const finalPayload: IncorporationFormPayloadV2 = {
		...payload,
		signature: { ...payload.signature },
	};
	const firmaDataUrl = payload.signature?.dataUrl;
	if (typeof firmaDataUrl === 'string' && firmaDataUrl.startsWith('data:')) {
		const firmaRef = await uploadFirma(
			owner.ownerId,
			incorporationId,
			firmaDataUrl,
		);
		if (!firmaRef) {
			return json(500, { ok: false, error: 'FIRMA_UPLOAD_FAILED' });
		}
		finalPayload.signature = { dataUrl: null, file: firmaRef };
	}

	const result = await submitIncorporationForm(supabase, {
		incorporationId,
		userId: owner.ownerId,
		payload: finalPayload,
	});

	if (!result.ok) {
		// Carrera: otro submit cerró el formulario entre el guard temprano y el
		// UPDATE atómico. Se responde 409, no 500 (no es un fallo del servidor).
		if (result.reason === 'NOT_EDITABLE') {
			log.warn('submit on non-editable form', {
				incorporationId,
				status: result.conflict,
			});
			return json(409, {
				ok: false,
				error: 'ALREADY_SUBMITTED',
				status: result.conflict,
				details: ['Este formulario ya fue enviado y no puede reenviarse.'],
			});
		}
		log.error('submit failed', { incorporationId, reason: result.reason });
		return json(500, { ok: false, error: 'SUBMIT_FAILED' });
	}

	return json(200, {
		ok: true,
		redirectTo:
			'/?status=success&msg=' +
			encodeURIComponent('Tu formulario se envió correctamente.'),
	});
};
