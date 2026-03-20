export const prerender = false;

import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@lib/supabase';

const BUCKET_NAME = 'test';
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const empresaId = url.searchParams.get('empresaId');
	const userId = url.searchParams.get('userId');
	const back = url.searchParams.get('back') || `/dashboard/${empresaId}`;

	const redirectWithStatus = (status: 'success' | 'error', msg: string) =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	const supabase: SupabaseClient = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	try {
		if (!empresaId || !userId) {
			return redirectWithStatus(
				'error',
				'Faltan parámetros: empresaId o userId',
			);
		}

		const form = await request.formData();
		const file = form.get('file') as File | null;
		const fileId = form.get('fileId') as string | null;

		if (!file || file.size === 0) {
			return redirectWithStatus('error', 'Archivo obligatorio');
		}

		if (!fileId) {
			return redirectWithStatus('error', 'Falta fileId');
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			return redirectWithStatus('error', 'El archivo no puede superar 15MB');
		}

		const fileName = `${file.name}`;
		const filePath = `${userId}/companies/${empresaId}/documents/${fileName}`;

		const { error: upErr } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(filePath, file, {
				upsert: false,
				contentType: file.type || 'application/octet-stream',
			});

		if (upErr) {
			console.error('[UPLOAD-FILE-SIGNED] Error al subir a Storage:', upErr);
			return redirectWithStatus('error', 'Error al subir el archivo');
		}

		const { error: updateErr } = await supabase
			.from('documentos_por_firmar')
			.update({
				status: 'Firmado',
				storage_path: filePath,
				updated_at: new Date().toISOString(),
			})
			.eq('id', fileId)
			.eq('user_id', userId)
			.eq('empresa_incorporacion_id', empresaId);

		if (updateErr) {
			console.error('[UPLOAD-FILE-SIGNED] Error al actualizar BD:', updateErr);
			return redirectWithStatus('error', 'Error al actualizar documento');
		}

		return redirectWithStatus('success', 'Documento firmado correctamente');
	} catch (e: unknown) {
		console.error('[UPLOAD-FILE-SIGNED] Excepción:', e);
		return redirectWithStatus(
			'error',
			'Error inesperado al subir el documento',
		);
	}
};
