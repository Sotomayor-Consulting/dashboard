export const prerender = false;

import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@lib/supabase';

const BUCKET_NAME = 'test';
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const empresaId = url.searchParams.get('empresaId');
	const userId = url.searchParams.get('userId');
	const back =
		url.searchParams.get('back') || `/companies/${empresaId}`;

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

		if (!empresaId) {
			return redirectWithStatus('error', 'Falta empresaId');
		}

		if (!userId) {
			return redirectWithStatus('error', 'Falta userId');
		}

		const form = await request.formData();
		const file = form.get('file') as File | null;

		if (!file || file.size === 0) {
			return redirectWithStatus('error', 'Archivo obligatorio');
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
			console.error('[UPLOAD-DOC] Error al subir a Storage:', upErr);
			return redirectWithStatus('error', 'Error al subir el archivo');
		}

		return redirectWithStatus('success', 'Documento subido correctamente');
	} catch (e: unknown) {
		console.error('[UPLOAD-DOC] Excepción:', e);
		return redirectWithStatus(
			'error',
			'Error inesperado al subir el documento',
		);
	}
};
