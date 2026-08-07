export const prerender = false;

import crypto from 'node:crypto';
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { BUCKETS, createScopedStorage } from '@infrastructure/storage';
import { safeBack } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('partners.upload-contract');

const DEFAULT_BACK_PATH = '/partners/settings/';
const BUCKET_NAME = BUCKETS.documents;
const RLS_SUB_FOLDER = 'contratos-partner';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = 'application/pdf';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), DEFAULT_BACK_PATH);

	const redirectWithStatus = (status: 'success' | 'error', msg: string) =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		const {
			data: { user },
			error: uerr,
		} = await supabase.auth.getUser();

		if (uerr || !user) {
			log.error('Error al obtener usuario', { error: uerr });
			return redirectWithStatus('error', 'No autenticado');
		}

		// 3) Leer formulario y validar archivo
		const form = await request.formData();
		const file = form.get('contract_file') as File | null;

		if (!file) {
			return redirectWithStatus('error', 'Archivo obligatorio');
		}

		if (file.size === 0) {
			return redirectWithStatus('error', 'El archivo está vacío');
		}

		if (file.type !== ALLOWED_MIME) {
			return redirectWithStatus('error', 'Solo se permiten archivos PDF');
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			return redirectWithStatus('error', 'El archivo no puede superar 5MB');
		}

		const fileName = 'contrato_firmado.pdf';
		const filePath = `${user.id}/${RLS_SUB_FOLDER}/${fileName}`;

		// 4) Subir el archivo al Storage (RLS: carpeta del propio usuario)
		try {
			await createScopedStorage(supabase).upload(BUCKET_NAME, filePath, file, {
				upsert: true,
				contentType: ALLOWED_MIME,
			});
		} catch (error) {
			log.error('Error al subir a Storage', { error });
			return redirectWithStatus(
				'error',
				'Error al subir el archivo al servidor',
			);
		}

		// 5) Registrar el documento en el schema `documents`
		//    (reemplaza la tabla legacy documentos_usuarios).
		const documentsDb = supabaseAdmin.schema('documents');
		const PARTNER_CONTRACT_TYPE_ID = 3; // documents.document_types → "Partner Contract"
		const now = new Date().toISOString();

		// Un contrato por usuario: si ya existe, se reemplaza.
		const { data: existingLink } = await documentsDb
			.from('document_links')
			.select('document_id')
			.eq('related_to_type', 'user')
			.eq('related_to_id', user.id)
			.eq('relation_purpose', 'owner')
			.limit(1)
			.maybeSingle();

		let documentId = existingLink?.document_id as string | undefined;

		if (documentId) {
			const { error: updErr } = await documentsDb
				.from('documents')
				.update({
					file_name: fileName,
					file_title: fileName,
					bucket_storage: BUCKET_NAME,
					bucket_path: filePath,
					file_size_bytes: file.size,
					mime_type: ALLOWED_MIME,
					status: 'uploaded',
					updated_by: user.id,
					updated_at: now,
				})
				.eq('id', documentId);
			if (updErr) {
				log.error('Error al actualizar documento', { error: updErr });
				return redirectWithStatus(
					'error',
					'Error al registrar el archivo en la base de datos',
				);
			}
		} else {
			documentId = crypto.randomUUID();
			const { error: insErr } = await documentsDb.from('documents').insert({
				id: documentId,
				document_type_id: PARTNER_CONTRACT_TYPE_ID,
				case_id: null,
				file_name: fileName,
				file_title: fileName,
				bucket_storage: BUCKET_NAME,
				bucket_path: filePath,
				file_size_bytes: file.size,
				mime_type: ALLOWED_MIME,
				status: 'uploaded',
				visibility: 'client_visible',
				version: 1,
				uploaded_by: user.id,
				uploaded_at: now,
				created_by: user.id,
				created_at: now,
				updated_by: user.id,
				updated_at: now,
			});
			if (insErr) {
				log.error('Error al guardar documento', { error: insErr });
				return redirectWithStatus(
					'error',
					'Error al registrar el archivo en la base de datos',
				);
			}
			const { error: linkErr } = await documentsDb
				.from('document_links')
				.insert({
					id: crypto.randomUUID(),
					document_id: documentId,
					related_to_type: 'user',
					related_to_id: user.id,
					relation_purpose: 'owner',
					is_primary: true,
					created_by: user.id,
					created_at: now,
				});
			if (linkErr) {
				log.error('Error al enlazar documento', { error: linkErr });
				return redirectWithStatus(
					'error',
					'Error al registrar el archivo en la base de datos',
				);
			}
		}

		// 6) OK
		return redirectWithStatus(
			'success',
			'Contrato subido y registrado correctamente',
		);
	} catch (e: unknown) {
		log.error('Excepción no controlada', { error: e });

		const msg =
			e &&
			typeof e === 'object' &&
			'message' in e &&
			typeof (e as any).message === 'string'
				? (e as any).message
				: 'Error inesperado al subir el contrato';

		return redirect(
			`${DEFAULT_BACK_PATH}?status=error&msg=${encodeURIComponent(msg)}`,
		);
	}
};
