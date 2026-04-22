import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@lib/supabase/admin';
import { notifyByEvent } from '@lib/notifications';
import {
	DEFAULT_SIGNED_URL_TTL_SECONDS,
	MAX_FILE_SIZE_BYTES,
	getDocumentsBucket,
} from './config';
import {
	jsonResponse,
	resolveActorRole,
	safeFilename,
	isStaffRole,
} from './helpers';
import type {
	CaseOwnerRow,
	DocumentActor,
	DocumentRelatedType,
	UploadDocumentInput,
	UploadDocumentResult,
} from './types';
import { DocumentsError } from './types';

const documentsDb = supabaseAdmin.schema('documents');

function buildStoragePath(
	ownerUserId: string,
	input: UploadDocumentInput,
	documentId: string,
): string {
	const fileName = safeFilename(input.file.name);
	if (
		input.relatedToType === 'incorporation_case' ||
		input.relatedToType === 'company'
	) {
		return `${ownerUserId}/companies/${input.relatedToId}/documents/${documentId}-${fileName}`;
	}

	return `${ownerUserId}/${input.relatedToType}/${input.relatedToId}/documents/${documentId}-${fileName}`;
}

async function getCaseOwner(caseId: string): Promise<CaseOwnerRow> {
	const { data, error } = await supabaseAdmin
		.from('empresas_incorporaciones')
		.select('empresa_incorporacion_id, user_id, nombre_1')
		.eq('empresa_incorporacion_id', caseId)
		.maybeSingle();

	if (error) {
		throw new DocumentsError(500, 'Error verificando acceso');
	}

	if (!data) {
		throw new DocumentsError(404, 'Caso no encontrado');
	}

	return {
		caseId: data.empresa_incorporacion_id,
		ownerUserId: data.user_id,
		caseName: data.nombre_1 ?? null,
	};
}

async function resolveCaseOwnerFromInput(
	input: UploadDocumentInput,
): Promise<CaseOwnerRow> {
	if (
		input.relatedToType === 'incorporation_case' ||
		input.relatedToType === 'company'
	) {
		return getCaseOwner(input.relatedToId);
	}

	if (!input.caseId) {
		throw new DocumentsError(
			400,
			'Falta caseId para el contexto de documento seleccionado',
		);
	}

	return getCaseOwner(input.caseId);
}

function assertCanManageContext(
	actor: DocumentActor,
	context: CaseOwnerRow,
): void {
	if (actor.isStaff) return;
	if (context.ownerUserId !== actor.userId) {
		throw new DocumentsError(403, 'No autorizado');
	}
}

async function getRequestRow(
	documentRequestId: string,
	relatedToType: DocumentRelatedType,
	relatedToId: string,
): Promise<{
	id: string;
	status: string;
	document_type_id: number | null;
	deleted_at: string | null;
}> {
	const { data: reqLink, error: linkErr } = await documentsDb
		.from('document_request_links')
		.select('id')
		.eq('document_request_id', documentRequestId)
		.eq('related_to_type', relatedToType)
		.eq('related_to_id', relatedToId)
		.maybeSingle();

	if (linkErr) {
		throw new DocumentsError(500, 'Error verificando solicitud');
	}

	if (!reqLink) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: reqData, error: reqErr } = await documentsDb
		.from('document_requests')
		.select('id, status, document_type_id, deleted_at')
		.eq('id', documentRequestId)
		.maybeSingle();

	if (reqErr) {
		throw new DocumentsError(500, 'Error cargando solicitud');
	}

	if (!reqData || reqData.deleted_at) {
		throw new DocumentsError(404, 'Solicitud no encontrada');
	}

	return reqData;
}

export async function uploadDocument(
	actor: DocumentActor,
	input: UploadDocumentInput,
): Promise<UploadDocumentResult> {
	if (!input.file || input.file.size === 0) {
		throw new DocumentsError(400, 'Archivo obligatorio');
	}

	if (input.file.size > MAX_FILE_SIZE_BYTES) {
		throw new DocumentsError(400, 'El archivo no puede superar 15MB');
	}

	const context = await resolveCaseOwnerFromInput(input);
	assertCanManageContext(actor, context);

	let requestRow: {
		id: string;
		status: string;
		document_type_id: number | null;
	} | null = null;

	if (input.documentRequestId) {
		requestRow = await getRequestRow(
			input.documentRequestId,
			input.relatedToType,
			input.relatedToId,
		);
	}

	const resolvedDocumentTypeId =
		requestRow?.document_type_id ?? input.documentTypeId;
	if (!resolvedDocumentTypeId) {
		throw new DocumentsError(400, 'Falta documentTypeId para subir documento');
	}

	const documentId = crypto.randomUUID();
	const bucket = getDocumentsBucket();
	const filePath = buildStoragePath(context.ownerUserId, input, documentId);

	const { error: uploadError } = await supabaseAdmin.storage
		.from(bucket)
		.upload(filePath, input.file, {
			upsert: false,
			contentType: input.file.type || 'application/octet-stream',
		});

	if (uploadError) {
		throw new DocumentsError(500, 'Error al subir el archivo');
	}

	const now = new Date().toISOString();

	const { error: insertErr } = await documentsDb.from('documents').insert({
		id: documentId,
		document_type_id: resolvedDocumentTypeId,
		document_request_id: input.documentRequestId ?? null,
		case_id: context.caseId,
		file_name: input.file.name,
		bucket_path: filePath,
		bucket_storage: bucket,
		file_size_bytes: input.file.size,
		file_title: input.file.name,
		mime_type: input.file.type || null,
		status: 'uploaded',
		visibility: input.visibility,
		is_sensitive: true,
		version: 1,
		uploaded_by: actor.userId,
		uploaded_at: now,
		created_by: actor.userId,
		created_at: now,
		updated_by: actor.userId,
		updated_at: now,
	});

	if (insertErr) {
		throw new DocumentsError(500, 'Error guardando documento');
	}

	const { error: linkErr } = await documentsDb.from('document_links').insert({
		id: crypto.randomUUID(),
		document_id: documentId,
		related_to_type: input.relatedToType,
		related_to_id: input.relatedToId,
		relation_purpose: 'owner',
		is_primary: true,
		created_by: actor.userId,
		created_at: now,
	});

	if (linkErr) {
		throw new DocumentsError(500, 'Error enlazando documento');
	}

	if (
		requestRow &&
		(requestRow.status === 'pending' || requestRow.status === 'sent')
	) {
		await documentsDb
			.from('document_requests')
			.update({ status: 'uploaded', updated_at: now })
			.eq('id', requestRow.id);
	}

	await documentsDb.from('document_events').insert({
		document_id: documentId,
		case_id: context.caseId,
		event_type: 'uploaded',
		to_status: 'uploaded',
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
		metadata: {
			document_request_id: input.documentRequestId ?? null,
			visibility: input.visibility,
			related_to_type: input.relatedToType,
			related_to_id: input.relatedToId,
		},
	});

	if (
		actor.isStaff &&
		input.visibility === 'client_visible' &&
		input.autoShare
	) {
		const targetUserId = input.shareWithUserId ?? context.ownerUserId;

		await documentsDb.from('document_shares').upsert(
			{
				document_id: documentId,
				case_id: context.caseId,
				shared_with_user_id: targetUserId,
				shared_by_user_id: actor.userId,
				share_status: 'active',
				shared_at: now,
				updated_at: now,
			},
			{
				onConflict: 'document_id,shared_with_user_id',
			},
		);

		await documentsDb.from('document_events').insert({
			document_id: documentId,
			case_id: context.caseId,
			event_type: 'shared',
			to_status: 'shared_active',
			actor_user_id: actor.userId,
			actor_role: actor.actorRole,
			metadata: {
				shared_with_user_id: targetUserId,
				related_to_type: input.relatedToType,
				related_to_id: input.relatedToId,
			},
		});

		await notifyByEvent({
			eventKey: 'documents.shared',
			recipients: [{ userId: targetUserId }],
			context: {
				case_name: context.caseName ?? 'tu incorporacion',
				action_url: `/documentos/${context.caseId}`,
			},
		});
	}

	return {
		documentId,
		caseId: context.caseId,
		ownerUserId: context.ownerUserId,
		caseName: context.caseName,
	};
}

export async function resolveDocumentActor(
	supabase: SupabaseClient,
	userRoles: string[],
): Promise<DocumentActor> {
	const { data: userData, error: userErr } = await supabase.auth.getUser();
	if (userErr || !userData?.user) {
		throw new DocumentsError(401, 'No autenticado');
	}

	return {
		userId: userData.user.id,
		userRoles,
		isStaff: isStaffRole(userRoles),
		actorRole: resolveActorRole(userRoles),
	};
}

export async function listDocumentsByContext(
	actor: DocumentActor,
	relatedToType: DocumentRelatedType,
	relatedToId: string,
): Promise<unknown> {
	const { data: links, error: linksErr } = await documentsDb
		.from('document_links')
		.select(
			`
			document_id,
			documents:document_id (
				id,
				case_id,
				file_name,
				file_title,
				bucket_path,
				file_size_bytes,
				mime_type,
				status,
				visibility,
				uploaded_at,
				created_at,
				document_request_id,
				document_types:document_type_id (
					id,
					code,
					name,
					legal_category,
					applies_to
				)
			)
		`,
		)
		.eq('related_to_type', relatedToType)
		.eq('related_to_id', relatedToId)
		.order('created_at', { ascending: false });

	if (linksErr) {
		throw new DocumentsError(500, 'Error listando documentos');
	}

	const docs = (
		((links ?? []) as Array<{ documents?: Record<string, unknown> | null }>)
			.map((item) => item.documents)
			.filter(Boolean) as Record<string, unknown>[]
	).map((doc) => ({
		...doc,
	}));

	const documentIds = docs
		.map((doc) => String(doc.id ?? ''))
		.filter((documentId) => !!documentId);

	let sharesByDocument = new Map<string, Array<Record<string, unknown>>>();
	if (documentIds.length > 0) {
		const { data: shares, error: sharesErr } = await documentsDb
			.from('document_shares')
			.select(
				'id, document_id, shared_with_user_id, shared_by_user_id, shared_at, share_status',
			)
			.in('document_id', documentIds);

		if (sharesErr) {
			throw new DocumentsError(500, 'Error listando comparticiones');
		}

		for (const share of (shares ?? []) as Array<Record<string, unknown>>) {
			const documentId = String(share.document_id ?? '');
			const prev = sharesByDocument.get(documentId) ?? [];
			prev.push(share);
			sharesByDocument.set(documentId, prev);
		}
	}

	const output = docs
		.map((doc) => {
			const docId = String(doc.id ?? '');
			const shares = sharesByDocument.get(docId) ?? [];
			const activeShares = shares.filter(
				(share) => share.share_status === 'active',
			);
			const isVisibleForClient =
				doc.visibility === 'client_visible' &&
				activeShares.some(
					(share) => share.shared_with_user_id === actor.userId,
				);

			return {
				...doc,
				shares,
				active_share_count: activeShares.length,
				is_visible_for_client: isVisibleForClient,
			};
		})
		.filter((doc) => {
			if (actor.isStaff) return true;
			return doc.is_visible_for_client;
		});

	return {
		role: actor.isStaff ? 'staff' : 'client',
		documents: output,
	};
}

export async function createDocumentSignedUrl(
	actor: DocumentActor,
	documentId: string,
): Promise<string> {
	const { data: doc, error: docErr } = await documentsDb
		.from('documents')
		.select('id, bucket_path, deleted_at, visibility, case_id')
		.eq('id', documentId)
		.maybeSingle();

	if (docErr) {
		throw new DocumentsError(500, 'Error consultando documento');
	}

	if (!doc || doc.deleted_at) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	if (!actor.isStaff) {
		if (doc.visibility !== 'client_visible') {
			throw new DocumentsError(403, 'No autorizado');
		}

		const { data: share, error: shareErr } = await documentsDb
			.from('document_shares')
			.select('id')
			.eq('document_id', documentId)
			.eq('shared_with_user_id', actor.userId)
			.eq('share_status', 'active')
			.maybeSingle();

		if (shareErr || !share) {
			throw new DocumentsError(403, 'No autorizado');
		}
	}

	const bucket = getDocumentsBucket();
	const { data, error } = await supabaseAdmin.storage
		.from(bucket)
		.createSignedUrl(doc.bucket_path, DEFAULT_SIGNED_URL_TTL_SECONDS);

	if (error) {
		throw new DocumentsError(500, 'Error generando enlace');
	}

	await documentsDb.from('document_events').insert({
		document_id: documentId,
		case_id: doc.case_id,
		event_type: 'downloaded',
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
		metadata: {
			signed_url_ttl_seconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
		},
	});

	return data.signedUrl;
}

export async function shareDocumentWithUser(
	actor: DocumentActor,
	documentId: string,
	sharedWithUserId?: string,
): Promise<{ caseId: string; sharedWithUserId: string }> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: doc, error: docErr } = await documentsDb
		.from('documents')
		.select('id, case_id')
		.eq('id', documentId)
		.maybeSingle();

	if (docErr || !doc) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	const { data: caseRow, error: caseErr } = await supabaseAdmin
		.from('empresas_incorporaciones')
		.select('empresa_incorporacion_id, user_id, nombre_1')
		.eq('empresa_incorporacion_id', doc.case_id)
		.maybeSingle();

	if (caseErr || !caseRow) {
		throw new DocumentsError(404, 'Caso no encontrado');
	}

	const targetUserId = sharedWithUserId || caseRow.user_id;
	const now = new Date().toISOString();

	const { error: updateDocErr } = await documentsDb
		.from('documents')
		.update({
			visibility: 'client_visible',
			updated_by: actor.userId,
			updated_at: now,
		})
		.eq('id', documentId);

	if (updateDocErr) {
		throw new DocumentsError(500, 'No se pudo actualizar visibilidad');
	}

	const { error: shareErr } = await documentsDb.from('document_shares').upsert(
		{
			document_id: documentId,
			case_id: doc.case_id,
			shared_with_user_id: targetUserId,
			shared_by_user_id: actor.userId,
			share_status: 'active',
			shared_at: now,
			updated_at: now,
		},
		{
			onConflict: 'document_id,shared_with_user_id',
		},
	);

	if (shareErr) {
		throw new DocumentsError(500, 'No se pudo compartir el documento');
	}

	await documentsDb.from('document_events').insert({
		document_id: documentId,
		case_id: doc.case_id,
		event_type: 'shared',
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
		to_status: 'shared_active',
		metadata: {
			shared_with_user_id: targetUserId,
		},
	});

	await notifyByEvent({
		eventKey: 'documents.shared',
		recipients: [{ userId: targetUserId }],
		context: {
			case_name: caseRow.nombre_1 ?? 'tu incorporacion',
			action_url: `/documentos/${doc.case_id}`,
		},
	});

	return {
		caseId: doc.case_id,
		sharedWithUserId: targetUserId,
	};
}

export async function revokeDocumentShare(
	actor: DocumentActor,
	documentId: string,
	sharedWithUserId?: string,
): Promise<{ caseId: string; revokedCount: number }> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: doc, error: docErr } = await documentsDb
		.from('documents')
		.select('id, case_id')
		.eq('id', documentId)
		.maybeSingle();

	if (docErr || !doc) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	const now = new Date().toISOString();

	let updateQuery = documentsDb
		.from('document_shares')
		.update({
			share_status: 'revoked',
			updated_at: now,
		})
		.eq('document_id', documentId)
		.eq('share_status', 'active');

	if (sharedWithUserId) {
		updateQuery = updateQuery.eq('shared_with_user_id', sharedWithUserId);
	}

	const { data: revokedRows, error: revokeErr } = await updateQuery.select(
		'id, shared_with_user_id',
	);

	if (revokeErr) {
		throw new DocumentsError(500, 'No se pudo revocar la comparticion');
	}

	await documentsDb.from('document_events').insert({
		document_id: documentId,
		case_id: doc.case_id,
		event_type: 'share_revoked',
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
		from_status: 'shared_active',
		to_status: 'shared_revoked',
		metadata: {
			shared_with_user_id: sharedWithUserId ?? null,
			revoked_count: revokedRows?.length ?? 0,
		},
	});

	if (revokedRows && revokedRows.length > 0) {
		await notifyByEvent({
			eventKey: 'documents.share_revoked',
			recipients: revokedRows.map((row) => ({
				userId: row.shared_with_user_id,
			})),
			context: {
				case_name: 'tu incorporacion',
				action_url: `/documentos/${doc.case_id}`,
			},
		});
	}

	return {
		caseId: doc.case_id,
		revokedCount: revokedRows?.length ?? 0,
	};
}

export async function listDocumentEvents(
	actor: DocumentActor,
	documentId: string,
): Promise<unknown[]> {
	if (!actor.isStaff) {
		const { data: share, error: shareErr } = await documentsDb
			.from('document_shares')
			.select('id')
			.eq('document_id', documentId)
			.eq('shared_with_user_id', actor.userId)
			.eq('share_status', 'active')
			.maybeSingle();

		if (shareErr || !share) {
			throw new DocumentsError(403, 'No autorizado');
		}
	}

	const { data: events, error } = await documentsDb
		.from('document_events')
		.select(
			'id, event_type, from_status, to_status, actor_user_id, actor_role, notes, metadata, created_at',
		)
		.eq('document_id', documentId)
		.order('created_at', { ascending: false })
		.limit(20);

	if (error) {
		throw new DocumentsError(500, 'No se pudo obtener el historial');
	}

	return events ?? [];
}

export function toJsonErrorResponse(error: unknown): Response {
	if (error instanceof DocumentsError) {
		return jsonResponse({ error: error.message }, error.status);
	}

	return jsonResponse({ error: 'Error inesperado' }, 500);
}
