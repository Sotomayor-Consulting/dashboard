export const prerender = false;

import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { BUCKETS, createScopedStorage } from '@infrastructure/storage';
import { checkRateLimit } from '@infrastructure/security/rate-limit';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('documents.upload-signed');

const BUCKET_NAME = BUCKETS.documents;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const empresaId = url.searchParams.get('empresaId');
	const userId = url.searchParams.get('userId');
	const fileIdFromUrl = url.searchParams.get('fileId');
	const back = url.searchParams.get('back') || `/dashboard/${empresaId}`;

	const redirectWithStatus = (status: 'success' | 'error', msg: string) =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	const supabase: SupabaseClient = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	try {
		const { data: userData } = await supabase.auth.getUser();
		const user = userData?.user;

		if (!user) {
			return redirectWithStatus('error', 'No autenticado');
		}

		const currentUserId = user.id;

		// Anti-abuso de storage: tope de subidas por usuario autenticado
		if (!checkRateLimit(`docs-upload:${currentUserId}`, 20, 60_000)) {
			return redirectWithStatus(
				'error',
				'Demasiadas subidas seguidas. Espera un minuto e intenta de nuevo.',
			);
		}

		if (!empresaId || !userId) {
			return redirectWithStatus(
				'error',
				'Faltan parámetros: empresaId o userId',
			);
		}

		const form = await request.formData();
		const file = form.get('file') as File | null;
		const fileIdFromForm = form.get('fileId') as string | null;
		const fileId = fileIdFromForm || fileIdFromUrl;

		if (!file || file.size === 0) {
			return redirectWithStatus('error', 'Archivo obligatorio');
		}

		if (!fileId) {
			return redirectWithStatus('error', 'Falta fileId');
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			return redirectWithStatus('error', 'El archivo no puede superar 15MB');
		}

		const safeFileName = file.name.replace(/\s+/g, '_');
		const filePath = `${currentUserId}/companies/${empresaId}/documents/signed-${fileId}-${safeFileName}`;

		// Storage atado a la sesión: las políticas RLS del bucket `documents`
		// siguen validando que el path caiga en la carpeta del propio usuario.
		try {
			await createScopedStorage(supabase).upload(BUCKET_NAME, filePath, file, {
				upsert: true,
				contentType: file.type || 'application/octet-stream',
			});
		} catch (error) {
			log.error('Error al subir a Storage', { error });
			return redirectWithStatus('error', 'Error al subir el archivo');
		}

		// Protección IDOR: como escribimos en el schema `documents` con admin
		// (ignora RLS), verificamos manualmente que el caso sea del usuario.
		const { data: caseRow, error: caseErr } = await supabaseAdmin
			.from('incorporations')
			.select('user_id')
			.eq('id', empresaId)
			.maybeSingle();

		if (caseErr || !caseRow || caseRow.user_id !== currentUserId) {
			log.error('Caso inexistente o ajeno al usuario', {
				empresaId,
				currentUserId,
			});
			return redirectWithStatus(
				'error',
				'No autorizado para firmar este documento',
			);
		}

		// Segunda mitad de la protección IDOR: el documento debe pertenecer al
		// caso. Antes esto era `.eq('case_id', empresaId)` en el update; ahora la
		// relación vive en document_links y la resuelve documents.resolve_case_id.
		const { data: documentCaseId, error: resolveErr } = await supabaseAdmin
			.schema('documents')
			.rpc('resolve_case_id', { p_document_id: fileId });

		if (resolveErr || documentCaseId !== empresaId) {
			log.error('Documento ajeno al caso indicado', {
				fileId,
				empresaId,
				documentCaseId,
				error: resolveErr,
			});
			return redirectWithStatus(
				'error',
				'No autorizado para firmar este documento',
			);
		}

		// El documento "por firmar" pasa de status 'pending' a 'uploaded'
		// (firmado) y se actualiza al archivo subido.
		const { data: updatedRows, error: updateErr } = await supabaseAdmin
			.schema('documents')
			.from('documents')
			.update({
				status: 'uploaded',
				is_signed: true,
				bucket_storage: BUCKET_NAME,
				bucket_path: filePath,
				file_name: safeFileName,
				file_title: safeFileName,
				file_size_bytes: file.size,
				mime_type: file.type || null,
				updated_by: currentUserId,
				updated_at: new Date().toISOString(),
			})
			.eq('id', fileId)
			.select('id');

		if (updateErr) {
			log.error('Error al actualizar BD', { error: updateErr });
			return redirectWithStatus('error', 'Error al actualizar documento');
		}

		if (!updatedRows || updatedRows.length === 0) {
			log.error('No se encontro documento para actualizar', {
				fileId,
				empresaId,
				currentUserId,
			});
			return redirectWithStatus(
				'error',
				'No se encontro el documento a actualizar',
			);
		}

		return redirectWithStatus('success', 'Documento firmado correctamente');
	} catch (e: unknown) {
		log.error('Excepción', { error: e });
		return redirectWithStatus(
			'error',
			'Error inesperado al subir el documento',
		);
	}
};
