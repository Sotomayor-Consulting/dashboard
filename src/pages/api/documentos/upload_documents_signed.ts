export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';

const BUCKET_NAME = 'test';
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const empresaId = url.searchParams.get('empresaId');
	const userId = url.searchParams.get('userId');
	const back =
		url.searchParams.get('back') || `/forms/upload_documents/${empresaId}`;

	const redirectWithStatus = (status: 'success' | 'error', msg: string) =>
		redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	try {
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');

		if (!at?.value || !rt?.value) {
			return redirectWithStatus('error', 'No autenticado');
		}

		const { error: sessionErr } = await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});

		if (sessionErr) {
			return redirectWithStatus('error', 'Sesión inválida');
		}

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
		const categoria = (form.get('categoria') as string) || 'general';

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

		const { error: insertErr } = await supabase
			.from('documentos_por_firmar')
			.insert([
				{
					user_id: userId,
					empresa_incorporacion_id: empresaId,
					storage_path: filePath,
					nombre: file.name,
					categoria,
					status: 'Pendiente_a_firma',
				},
			]);

		if (insertErr) {
			console.error('[UPLOAD-DOC] Error al insertar en BD:', insertErr);
			return redirectWithStatus('error', 'Error al registrar documento');
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
