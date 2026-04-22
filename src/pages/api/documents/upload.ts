export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';
import crypto from 'node:crypto';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const STAFF_ROLES = new Set(['admin', 'operaciones']);
const BUCKET_STORAGE = "documents"

function getDocumentsBucket(): string {
	return (
		process.env.SUPABASE_DOCUMENTS_BUCKET ??
		import.meta.env.SUPABASE_DOCUMENTS_BUCKET ??
		'documents'
	);
}

function safeFilename(name: string): string {
	return name
		.replace(/[/\\]/g, '_')
		.replace(/\s+/g, '_')
		.replace(/[^\w.\-()]/g, '_');
}

function isStaffRole(userRoles: string[]) {
	return userRoles.some((role) => STAFF_ROLES.has(role));
}

export const POST: APIRoute = async ({ request, cookies, redirect, url, locals }) => {
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const redirectWithStatus = (
		back: string,
		status: 'success' | 'error',
		msg: string,
	) => redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

	try {
		const { data: userData, error: userErr } = await supabase.auth.getUser();
		if (userErr || !userData?.user) {
			return new Response('No autenticado', { status: 401 });
		}

		const userId = userData.user.id;
		const userRoles = locals.userRoles || [];
		const isStaff = isStaffRole(userRoles);

		const form = await request.formData();

		const incorporationCaseId =
			url.searchParams.get('incorporationCaseId') ||
			(form.get('incorporationCaseId') as string | null);
		const documentRequestId =
			url.searchParams.get('documentRequestId') ||
			(form.get('documentRequestId') as string | null);
		const backParam =
			url.searchParams.get('back') || (form.get('back') as string | null);
		const back = backParam ?? `/documentos/${incorporationCaseId ?? ''}`;

		const file = form.get('file') as File | null;
		const visibilityRaw =
			(url.searchParams.get('visibility') ||
				(form.get('visibility') as string | null) ||
				'').trim() || null;
		const visibility = isStaff
			? visibilityRaw === 'client_visible'
				? 'client_visible'
				: 'internal_only'
			: 'client_visible';
		const documentTypeIdRaw =
			(url.searchParams.get('documentTypeId') ||
				(form.get('documentTypeId') as string | null) ||
				'').trim() || null;
		const shouldAutoShare =
			(url.searchParams.get('shareWithClient') ||
				(form.get('shareWithClient') as string | null) ||
				'true') !== 'false';

		if (!incorporationCaseId) {
			return redirectWithStatus(back, 'error', 'Falta incorporationCaseId');
		}
		if (!documentRequestId && !isStaff) {
			return redirectWithStatus(back, 'error', 'Falta documentRequestId');
		}
		if (!file || file.size === 0) {
			return redirectWithStatus(back, 'error', 'Archivo obligatorio');
		}
		if (file.size > MAX_FILE_SIZE_BYTES) {
			return redirectWithStatus(back, 'error', 'El archivo no puede superar 15MB');
		}

		// 1) Ownership: user must own the incorporation case
		const { data: ownedCase, error: ownErr } = await supabaseAdmin
			.from('empresas_incorporaciones')
			.select('empresa_incorporacion_id, user_id, nombre_1')
			.eq('empresa_incorporacion_id', incorporationCaseId)
			.maybeSingle();

		if (ownErr) {
			console.error('[documents/upload] Ownership check error:', ownErr);
			return redirectWithStatus(back, 'error', 'Error verificando acceso');
		}
		if (!ownedCase) {
			return new Response('No autorizado', { status: 403 });
		}
		if (!isStaff && ownedCase.user_id !== userId) {
			return new Response('No autorizado', { status: 403 });
		}

		let requestRow: {
			id: string;
			status: string;
			document_type_id: string | null;
			deleted_at: string | null;
		} | null = null;
		if (documentRequestId) {
			const { data: reqLink, error: linkErr } = await supabaseAdmin
				.from('document_request_links')
				.select('id')
				.eq('document_request_id', documentRequestId)
				.eq('related_to_type', 'incorporation_case')
				.eq('related_to_id', incorporationCaseId)
				.maybeSingle();

			if (linkErr) {
				console.error('[documents/upload] Link check error:', linkErr);
				return redirectWithStatus(back, 'error', 'Error verificando solicitud');
			}
			if (!reqLink) {
				return new Response('No autorizado', { status: 403 });
			}

			const { data: reqData, error: reqErr } = await supabaseAdmin
				.from('document_requests')
				.select('id, status, document_type_id, deleted_at')
				.eq('id', documentRequestId)
				.maybeSingle();

			if (reqErr) {
				console.error('[documents/upload] Request fetch error:', reqErr);
				return redirectWithStatus(back, 'error', 'Error cargando solicitud');
			}
			if (!reqData || reqData.deleted_at) {
				return redirectWithStatus(back, 'error', 'Solicitud no encontrada');
			}
			requestRow = reqData;
		}

		const documentId = crypto.randomUUID();
		const fileName = safeFilename(file.name);
		const filePath = `${ownedCase.user_id}/companies/${incorporationCaseId}/documents/${documentId}-${fileName}`;
		const bucket = getDocumentsBucket();

		// 4) Upload to storage
		const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(filePath, file, {
			upsert: false,
			contentType: file.type || 'application/octet-stream',
		});

		if (upErr) {
			console.error('[documents/upload] Storage upload error:', upErr);
			return redirectWithStatus(back, 'error', 'Error al subir el archivo');
		}

		const now = new Date().toISOString();

		// 5) Insert document
		const { error: insertErr } = await supabaseAdmin.from('documents').insert({
			id: documentId,
			document_type_id: requestRow?.document_type_id ?? documentTypeIdRaw,
			document_request_id: documentRequestId ?? null,
			case_id: incorporationCaseId,
			file_name: file.name,
			bucket_path: filePath,
			bucket_storage: BUCKET_STORAGE,
			file_size_bytes: file.size,
			file_title: file.name,
			mime_type: file.type || null,
			status: 'uploaded',
			visibility,
			is_sensitive: true,
			version: 1,
			uploaded_by: userId,
			uploaded_at: now,
			created_by: userId,
			created_at: now,
			updated_by: userId,
			updated_at: now,
		});

		if (insertErr) {
			console.error('[documents/upload] Insert document error:', insertErr);
			return redirectWithStatus(back, 'error', 'Error guardando documento');
		}

		// 6) Link document to incorporation case
		const { error: linkInsertErr } = await supabaseAdmin.from('document_links').insert({
			id: crypto.randomUUID(),
			document_id: documentId,
			related_to_type: 'incorporation_case',
			related_to_id: incorporationCaseId,
			relation_purpose: 'owner',
			is_primary: true,
			created_by: userId,
			created_at: now,
		});

		if (linkInsertErr) {
			console.error('[documents/upload] Insert document link error:', linkInsertErr);
			return redirectWithStatus(back, 'error', 'Error enlazando documento');
		}

		// 7) Update request status (best-effort)
		if (
			requestRow &&
			(requestRow.status === 'pending' || requestRow.status === 'sent')
		) {
			const { error: updErr } = await supabaseAdmin
				.from('document_requests')
				.update({ status: 'uploaded', updated_at: now })
				.eq('id', documentRequestId);

			if (updErr) {
				console.error('[documents/upload] Update request status error:', updErr);
				// Keep successful upload result; status update can be fixed manually.
			}
		}

		await supabaseAdmin.from('document_events').insert({
			document_id: documentId,
			case_id: incorporationCaseId,
			event_type: 'uploaded',
			to_status: 'uploaded',
			actor_user_id: userId,
			actor_role: isStaff
				? userRoles.includes('admin')
					? 'admin'
					: 'operaciones'
				: 'cliente',
			metadata: {
				document_request_id: documentRequestId ?? null,
				visibility,
			},
		});

		if (isStaff && visibility === 'client_visible' && shouldAutoShare) {
			await supabaseAdmin.from('document_shares').upsert(
				{
					document_id: documentId,
					shared_with_user_id: ownedCase.user_id,
					shared_by_user_id: userId,
					share_status: 'active',
					shared_at: now,
					updated_at: now,
				},
				{
					onConflict: 'document_id,shared_with_user_id',
				},
			);

			await supabaseAdmin.from('document_events').insert({
				document_id: documentId,
				case_id: incorporationCaseId,
				event_type: 'shared',
				to_status: 'shared_active',
				actor_user_id: userId,
				actor_role: userRoles.includes('admin') ? 'admin' : 'operaciones',
				metadata: {
					shared_with_user_id: ownedCase.user_id,
				},
			});

			await supabaseAdmin.from('notifications').insert({
				user_id: ownedCase.user_id,
				message: `Operaciones compartió un documento de tu caso ${ownedCase.nombre_1 ?? ''}.`,
				link: `/documentos/${incorporationCaseId}`,
				mensaje_link: 'Ver documentos',
				created_at: now,
			});
		}

		return redirectWithStatus(back, 'success', 'Documento subido correctamente');
	} catch (e: unknown) {
		console.error('[documents/upload] Unexpected error:', e);
		return new Response('Error inesperado', { status: 500 });
	}
};
