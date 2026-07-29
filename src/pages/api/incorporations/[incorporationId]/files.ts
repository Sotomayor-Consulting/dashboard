export const prerender = false;

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { BUCKETS, storage } from '@infrastructure/storage';
import { json } from '@shared/api/company-data';
import { getIncorporationOwner } from '@domains/workflow/incorporation-forms';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('incorporations.files');

const BUCKET = BUCKETS.incorporationDocuments;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = new Set([
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
]);

/**
 * Slots permitidos → función que construye la subcarpeta.
 *
 * Estructura del bucket (según diagrama):
 *   {uid}/incorporations/{incId}/company/service-bill.{ext}
 *   {uid}/incorporations/{incId}/members/{memberId}/passport.{ext}
 *   {uid}/incorporations/{incId}/members/{memberId}/service-bill.{ext}
 *   {uid}/incorporations/{incId}/managers/{managerId}/passport.{ext}
 *   {uid}/incorporations/{incId}/managers/{managerId}/service-bill.{ext}
 *
 * Slots que requieren `entityId`: member-passport, member-utility,
 * manager-passport, manager-utility.
 */
interface SlotDef {
	folder: (entityId?: string) => string;
	needsEntity: boolean;
	filename: string;
}

const SLOTS: Record<string, SlotDef> = {
	'member-pasaporte': {
		folder: (id) => `members/${id}`,
		needsEntity: true,
		filename: 'passport',
	},
	'member-factura': {
		folder: (id) => `members/${id}`,
		needsEntity: true,
		filename: 'service-bill',
	},
	'manager-pasaporte': {
		folder: (id) => `managers/${id}`,
		needsEntity: true,
		filename: 'passport',
	},
	'manager-factura': {
		folder: (id) => `managers/${id}`,
		needsEntity: true,
		filename: 'service-bill',
	},
	'company-utility-us': {
		folder: () => 'company',
		needsEntity: false,
		filename: 'service-bill',
	},
};

const EXT_BY_TYPE: Record<string, string> = {
	'application/pdf': 'pdf',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
};

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ownerPrefix = (ownerId: string, incorporationId: string) =>
	`${ownerId}/incorporations/${incorporationId}`;

/**
 * POST (multipart) — sube un archivo del formulario al seleccionarlo.
 * Campos: `file`, `slot`, `entityId` (obligatorio para slots de member/manager).
 * Devuelve `{ path, name }` para guardar en el payload.
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

	const form = await request.formData();
	const file = form.get('file');
	const slotKey = (form.get('slot') as string | null)?.trim() ?? '';
	const entityId = (form.get('entityId') as string | null)?.trim() ?? '';

	if (!(file instanceof File)) {
		return json(400, { ok: false, error: 'FILE_REQUIRED' });
	}
	const slotDef = SLOTS[slotKey];
	if (!slotDef) {
		return json(400, { ok: false, error: 'INVALID_SLOT' });
	}
	if (slotDef.needsEntity && (!entityId || !UUID_RE.test(entityId))) {
		return json(400, { ok: false, error: 'ENTITY_ID_REQUIRED' });
	}
	if (file.size > MAX_FILE_SIZE) {
		return json(413, { ok: false, error: 'FILE_TOO_LARGE' });
	}
	if (!ACCEPTED_TYPES.has(file.type)) {
		return json(415, { ok: false, error: 'UNSUPPORTED_TYPE' });
	}

	const ext = EXT_BY_TYPE[file.type] ?? 'bin';
	const subfolder = slotDef.folder(entityId || undefined);
	const uniqueSuffix = crypto.randomUUID().slice(0, 8);
	const path = `${ownerPrefix(owner.ownerId, incorporationId)}/${subfolder}/${slotDef.filename}_${uniqueSuffix}.${ext}`;

	try {
		const bytes = Buffer.from(await file.arrayBuffer());
		await storage.upload(BUCKET, path, bytes, {
			contentType: file.type,
			upsert: false,
		});

		return json(200, { ok: true, path, name: file.name });
	} catch (error) {
		log.error('upload exception', { incorporationId, slotKey, error });
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

	if (!path.startsWith(`${ownerPrefix(owner.ownerId, incorporationId)}/`)) {
		return json(403, { ok: false, error: 'PATH_NOT_ALLOWED' });
	}

	try {
		await storage.remove(BUCKET, [path]);
	} catch (error) {
		log.error('delete failed', { incorporationId, path, error });
		return json(500, { ok: false, error: 'DELETE_FAILED' });
	}

	return json(200, { ok: true });
};
