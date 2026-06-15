export const prerender = false;

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { json } from '@shared/api/company-data';
import { getIncorporationOwner } from '@domains/workflow/incorporation-forms';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('incorporations.files');

const BUCKET = 'documentos_empresas';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = new Set([
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
]);

/** Slots permitidos → subcarpeta. Evita rutas arbitrarias del cliente. */
const SLOTS: Record<string, string> = {
	'member-pasaporte': 'socios/pasaporte',
	'member-factura': 'socios/servicio_basico',
	'manager-pasaporte': 'managers/pasaporte',
	'manager-factura': 'managers/servicio_basico',
	'company-utility-us': 'empresa/servicio_basico',
	'company-utility-other': 'empresa/servicio_basico',
};

const EXT_BY_TYPE: Record<string, string> = {
	'application/pdf': 'pdf',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

/** Prefijo de carpeta del dueño; la política de lectura exige `{uid}/...`. */
const ownerPrefix = (ownerId: string, incorporationId: string) =>
	`${ownerId}/incorporations/${incorporationId}`;

/**
 * POST (multipart) — sube un archivo del formulario al seleccionarlo.
 * Campos: `file`, `slot`. Devuelve `{ path, name }` para guardar en el payload.
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

	// Ownership vía RLS (cliente per-request) antes de usar el cliente admin.
	const owner = await getIncorporationOwner(supabase, incorporationId);
	if (!owner) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const form = await request.formData();
	const file = form.get('file');
	const slot = (form.get('slot') as string | null)?.trim() ?? '';

	if (!(file instanceof File)) {
		return json(400, { ok: false, error: 'FILE_REQUIRED' });
	}
	const subfolder = SLOTS[slot];
	if (!subfolder) {
		return json(400, { ok: false, error: 'INVALID_SLOT' });
	}
	if (file.size > MAX_FILE_SIZE) {
		return json(413, { ok: false, error: 'FILE_TOO_LARGE' });
	}
	if (!ACCEPTED_TYPES.has(file.type)) {
		return json(415, { ok: false, error: 'UNSUPPORTED_TYPE' });
	}

	const ext = EXT_BY_TYPE[file.type] ?? 'bin';
	const path = `${ownerPrefix(owner.ownerId, incorporationId)}/${subfolder}/${crypto.randomUUID()}.${ext}`;

	try {
		const bytes = Buffer.from(await file.arrayBuffer());
		const { error: upErr } = await supabaseAdmin.storage
			.from(BUCKET)
			.upload(path, bytes, { contentType: file.type, upsert: false });

		if (upErr) {
			log.error('upload failed', { incorporationId, slot, error: upErr });
			return json(500, { ok: false, error: 'UPLOAD_FAILED' });
		}

		return json(200, { ok: true, path, name: file.name });
	} catch (error) {
		log.error('upload exception', { incorporationId, slot, error });
		return json(500, { ok: false, error: 'UPLOAD_FAILED' });
	}
};

interface DeleteBody {
	path?: string;
}

/** DELETE — elimina un archivo previamente subido (al quitarlo del formulario). */
export const DELETE: APIRoute = async ({ request, cookies, params }) => {
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

	const body = (await request.json().catch(() => null)) as DeleteBody | null;
	const path = body?.path?.trim();
	if (!path) {
		return json(400, { ok: false, error: 'PATH_REQUIRED' });
	}

	// Solo puede borrar dentro de su propia carpeta de esta incorporación.
	if (!path.startsWith(`${ownerPrefix(owner.ownerId, incorporationId)}/`)) {
		return json(403, { ok: false, error: 'PATH_NOT_ALLOWED' });
	}

	const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
	if (error) {
		log.error('delete failed', { incorporationId, path, error });
		return json(500, { ok: false, error: 'DELETE_FAILED' });
	}

	return json(200, { ok: true });
};
