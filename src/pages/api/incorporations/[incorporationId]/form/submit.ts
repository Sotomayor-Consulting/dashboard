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
	completeClientFormSubmitTask,
} from '@domains/workflow/incorporation-forms';
import {
	INCORPORATION_FORM_VERSION,
	type IncorporationFormPayloadV2,
	validateIncorporationFormPayload,
	resolveManagerAddresses,
} from '@modules/companies/stages/client-form/payload';
import type { FileRef } from '@modules/companies/stages/client-form/types';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('incorporations.form.submit');

const BUCKET = 'incorporation_documents';
const MAX_BODY_BYTES = 256 * 1024; // 256 KB
const MAX_FIRMA_B64_BYTES = 2 * 1024 * 1024; // 2 MB de base64 (~1.5 MB imagen)

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
	const path = `${ownerId}/incorporations/${incorporationId}/signature.${ext}`;
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
		name: `signature.${ext}`,
		mime: mime ?? 'image/png',
		size: bytes.byteLength,
	};
}

// ---------------------------------------------------------------------------
// Helpers de validación de paths
// ---------------------------------------------------------------------------

interface LabeledPath {
	path: string;
	label: string;
}

/**
 * Extrae todos los paths de FileRef presentes en el payload.
 * Devuelve pares `{ path, label }` para usar en ownership y existencia.
 */
function collectFilePaths(
	payload: IncorporationFormPayloadV2,
): LabeledPath[] {
	const paths: LabeledPath[] = [];

	const add = (ref: FileRef | null | undefined, label: string) => {
		if (ref?.path) paths.push({ path: ref.path, label });
	};

	add(payload.general?.operatingAddress?.utilityBill, 'Dirección operativa: planilla');

	(payload.members?.list ?? []).forEach((m, i) => {
		const tag = `Socio ${String(i + 1).padStart(2, '0')}`;
		add(m.documents?.utilityBill, `${tag}: planilla`);
		if (m.type === 'company') {
			add(m.documents?.existenceCertificate, `${tag}: certificado`);
		} else {
			add(m.documents?.passport, `${tag}: pasaporte`);
		}
	});

	(payload.managers?.list ?? []).forEach((mg, i) => {
		const tag = `Manager ${String(i + 1).padStart(2, '0')}`;
		add(mg.documents?.passport, `${tag}: pasaporte`);
		add(mg.documents?.utilityBill, `${tag}: planilla`);
	});

	add(payload.signature?.file, 'Firma');

	return paths;
}

/**
 * Verifica que TODOS los paths de archivos del payload empiecen con el
 * prefijo esperado `{ownerId}/incorporations/{incorporationId}/`.
 */
function validatePathOwnership(
	filePaths: LabeledPath[],
	expectedPrefix: string,
): string[] {
	return filePaths
		.filter((fp) => !fp.path.startsWith(expectedPrefix))
		.map((fp) => `${fp.label}: ruta no pertenece a esta incorporación.`);
}

/**
 * Verifica que cada path exista en Storage listando el directorio padre y
 * buscando el nombre del archivo. Más ligero que generar signed URLs.
 */
async function verifyFilesExist(filePaths: LabeledPath[]): Promise<string[]> {
	if (filePaths.length === 0) return [];

	const byFolder = new Map<string, LabeledPath[]>();
	for (const fp of filePaths) {
		const lastSlash = fp.path.lastIndexOf('/');
		const folder = fp.path.slice(0, lastSlash);
		const existing = byFolder.get(folder);
		if (existing) existing.push(fp);
		else byFolder.set(folder, [fp]);
	}

	const missing: string[] = [];
	await Promise.all(
		[...byFolder.entries()].map(async ([folder, paths]) => {
			const { data: items } = await supabaseAdmin.storage
				.from(BUCKET)
				.list(folder, { limit: 500 });
			const names = new Set((items ?? []).map((f) => f.name));
			for (const fp of paths) {
				const fileName = fp.path.slice(fp.path.lastIndexOf('/') + 1);
				if (!names.has(fileName)) missing.push(fp.label);
			}
		}),
	);

	return missing;
}

/**
 * Elimina archivos en Storage que están dentro de la carpeta de la
 * incorporación pero NO aparecen en el payload final. Se ejecuta fire-and-forget
 * después de un submit exitoso — un fallo aquí no afecta al usuario.
 */
async function cleanupOrphanedFiles(
	ownerId: string,
	incorporationId: string,
	keepPaths: LabeledPath[],
): Promise<void> {
	const prefix = `${ownerId}/incorporations/${incorporationId}`;
	const keepSet = new Set(keepPaths.map((fp) => fp.path));

	try {
		const { data: files, error } = await supabaseAdmin.storage
			.from(BUCKET)
			.list(prefix, { limit: 500 });

		if (error || !files) return;

		const toDelete: string[] = [];

		const collectRecursive = async (folder: string) => {
			const { data: items } = await supabaseAdmin.storage
				.from(BUCKET)
				.list(folder, { limit: 500 });
			if (!items) return;
			for (const item of items) {
				const fullPath = `${folder}/${item.name}`;
				if (item.metadata) {
					if (!keepSet.has(fullPath)) toDelete.push(fullPath);
				} else {
					await collectRecursive(fullPath);
				}
			}
		};

		for (const item of files) {
			const fullPath = `${prefix}/${item.name}`;
			if (item.metadata) {
				if (!keepSet.has(fullPath)) toDelete.push(fullPath);
			} else {
				await collectRecursive(fullPath);
			}
		}

		if (toDelete.length > 0) {
			const { error: delError } = await supabaseAdmin.storage
				.from(BUCKET)
				.remove(toDelete);
			if (delError) {
				log.warn('orphan cleanup partial failure', { incorporationId, error: delError });
			} else {
				log.info('orphaned files cleaned', { incorporationId, count: toDelete.length });
			}
		}
	} catch (err) {
		log.warn('orphan cleanup error', { incorporationId, err });
	}
}

/**
 * POST — submit final del formulario. Valida integridad, ownership de paths,
 * existencia de archivos, sube la firma y marca el staging como `submitted`.
 */
export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const contentLength = parseInt(
		request.headers.get('content-length') ?? '0',
		10,
	);
	if (contentLength > MAX_BODY_BYTES) {
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

	const owner = await getIncorporationOwner(supabase, incorporationId);
	if (!owner) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

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

	if (payload.version !== INCORPORATION_FORM_VERSION) {
		return json(400, {
			ok: false,
			error: 'VERSION_MISMATCH',
			details: [
				`Versión del formulario no soportada: ${payload.version ?? 'none'}`,
			],
		});
	}

	const firmaDataUrl = payload.signature?.dataUrl;
	if (
		typeof firmaDataUrl === 'string' &&
		firmaDataUrl.length > MAX_FIRMA_B64_BYTES
	) {
		return json(413, {
			ok: false,
			error: 'FIRMA_TOO_LARGE',
			details: ['La firma es demasiado grande (máximo ~1.5 MB).'],
		});
	}

	// Recopilar todos los paths de archivos del payload.
	const filePaths = collectFilePaths(payload);

	// 1) Path ownership: prefijo correcto.
	const expectedPrefix = `${owner.ownerId}/incorporations/${incorporationId}/`;
	const ownershipErrors = validatePathOwnership(filePaths, expectedPrefix);
	if (ownershipErrors.length > 0) {
		log.warn('path ownership violation', {
			incorporationId,
			userId: owner.ownerId,
			errors: ownershipErrors,
		});
		return json(403, {
			ok: false,
			error: 'PATH_OWNERSHIP',
			details: ownershipErrors,
		});
	}

	// 2) Existencia en Storage: verificar que los archivos realmente existan.
	const missingFiles = await verifyFilesExist(filePaths);
	if (missingFiles.length > 0) {
		log.warn('missing files in storage', {
			incorporationId,
			missing: missingFiles,
		});
		return json(422, {
			ok: false,
			error: 'FILES_NOT_FOUND',
			details: missingFiles.map(
				(label) => `${label}: el archivo no se encuentra en el servidor. Vuelve a subirlo.`,
			),
		});
	}

	// 3) Validación de completitud del payload.
	const errors = validateIncorporationFormPayload(payload);
	if (errors.length > 0) {
		log.warn('submit validation failed', { incorporationId, errors });
		return json(422, { ok: false, error: 'VALIDATION', details: errors });
	}

	resolveManagerAddresses(payload);

	// 4) Subir firma.
	const finalPayload: IncorporationFormPayloadV2 = {
		...payload,
		signature: { ...payload.signature },
	};
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

	// 5) Persistir.
	const result = await submitIncorporationForm(supabase, {
		incorporationId,
		userId: owner.ownerId,
		payload: finalPayload,
	});

	if (!result.ok) {
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

	log.info('form submitted', {
		incorporationId,
		membersCount: payload.members?.list?.length ?? 0,
		managersCount: payload.managers?.list?.length ?? 0,
		management: payload.general?.management,
	});

	// 6) Completar tarea(s) del workflow para la etapa client_form (best-effort).
	void completeClientFormSubmitTask(incorporationId, owner.ownerId);

	// 7) Cleanup: eliminar archivos huérfanos en Storage (best-effort).
	void cleanupOrphanedFiles(
		owner.ownerId,
		incorporationId,
		collectFilePaths(finalPayload),
	);

	return json(200, {
		ok: true,
		redirectTo:
			'/?status=success&msg=' +
			encodeURIComponent('Tu formulario se envió correctamente.'),
	});
};
