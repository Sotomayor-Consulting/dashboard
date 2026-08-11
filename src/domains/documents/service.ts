import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	sendDocumentRequestedEmail,
	sendDocumentSharedEmail,
} from '@infrastructure/email/bussiness-events';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { notifyByEvent } from '@infrastructure/notifications';
import { createLogger } from '@infrastructure/logging';
import {
	BUCKETS,
	DEFAULT_SIGNED_URL_TTL_SECONDS,
	storage,
} from '@infrastructure/storage';
import { MAX_FILE_SIZE_BYTES } from './config';
import {
	clientDocumentsPath,
	jsonResponse,
	resolveActorRole,
	safeFilename,
	isStaffRole,
	insertDocumentWithLink,
} from './helpers';
import type {
	CaseOwnerRow,
	CreateDocumentRequestInput,
	CreateDocumentRequestResult,
	DocumentActor,
	DocumentRelatedType,
	UploadDocumentInput,
	UploadDocumentResult,
} from './types';
import { DocumentsError } from './types';

const log = createLogger('domains.documents.service');
const documentsDb = supabaseAdmin.schema('documents');
// Estados terminales de una solicitud: ya no admiten nuevas cargas.
// ('closed' no existe en el enum document_request_status; se retiró.)
const BLOCKED_REQUEST_STATUSES = new Set(['approved', 'cancelled', 'rejected']);

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

/**
 * Resuelve la incorporación de un documento a partir de document_links, que
 * es la única fuente de verdad de esa relación desde que se eliminó la
 * columna denormalizada documents.documents.case_id.
 *
 * Delega en la función SQL documents.resolve_case_id, que cubre las dos
 * rutas posibles: link directo al 'incorporation_case', o link a una
 * 'company' de la que se toma su incorporation_id.
 */
async function resolveCaseIdForDocument(
	documentId: string,
): Promise<string | null> {
	const { data, error } = await documentsDb.rpc('resolve_case_id', {
		p_document_id: documentId,
	});

	if (error) {
		log.error('resolve_case_id failed', { documentId, error });
		return null;
	}

	return (data as string | null) ?? null;
}

async function getCaseOwner(caseId: string): Promise<CaseOwnerRow> {
	const { data, error } = await supabaseAdmin
		.from('incorporations')
		.select('id, user_id, principal_name')
		.eq('id', caseId)
		.maybeSingle();

	if (error) {
		throw new DocumentsError(500, 'Error verificando acceso');
	}

	if (!data) {
		throw new DocumentsError(404, 'Caso no encontrado');
	}

	return {
		caseId: data.id,
		ownerUserId: data.user_id,
		caseName: data.principal_name ?? null,
	};
}

async function getCompanyOwner(companyId: string): Promise<CaseOwnerRow> {
	const { data, error } = await supabaseAdmin
		.from('companies')
		.select('id, user_id, legal_name, incorporation_id')
		.eq('id', companyId)
		.maybeSingle();

	if (error) {
		throw new DocumentsError(500, 'Error verificando acceso');
	}

	if (!data) {
		throw new DocumentsError(404, 'Empresa no encontrada');
	}

	return {
		caseId: data.incorporation_id ?? null,
		ownerUserId: data.user_id,
		caseName: data.legal_name ?? null,
	};
}

async function resolveCaseOwnerFromInput(
	input: UploadDocumentInput,
): Promise<CaseOwnerRow> {
	if (input.relatedToType === 'incorporation_case') {
		return getCaseOwner(input.relatedToId);
	}
	if (input.relatedToType === 'company') {
		return getCompanyOwner(input.relatedToId);
	}

	if (!input.caseId) {
		throw new DocumentsError(
			400,
			'Falta caseId para el contexto de documento seleccionado',
		);
	}

	return getCaseOwner(input.caseId);
}

async function resolveCaseOwnerFromContext(
	relatedToType: DocumentRelatedType,
	relatedToId: string,
	caseId?: string | null,
): Promise<CaseOwnerRow> {
	if (relatedToType === 'incorporation_case') {
		return getCaseOwner(relatedToId);
	}
	if (relatedToType === 'company') {
		return getCompanyOwner(relatedToId);
	}

	if (!caseId) {
		throw new DocumentsError(
			400,
			'Falta caseId para el contexto de solicitud seleccionado',
		);
	}

	return getCaseOwner(caseId);
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
		.select('id, status, document_type_id')
		.eq('id', documentRequestId)
		.maybeSingle();

	if (reqErr) {
		throw new DocumentsError(500, 'Error cargando solicitud');
	}

	// Las solicitudes archivadas se marcan 'cancelled' (ya no hay soft-delete).
	if (!reqData || reqData.status === 'cancelled') {
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

		if (BLOCKED_REQUEST_STATUSES.has(requestRow.status)) {
			throw new DocumentsError(
				409,
				`La solicitud ya no permite subir documentos (estado: ${requestRow.status})`,
			);
		}
	}

	const resolvedDocumentTypeId =
		requestRow?.document_type_id ?? input.documentTypeId;
	if (!resolvedDocumentTypeId) {
		throw new DocumentsError(400, 'Falta documentTypeId para subir documento');
	}

	const documentId = crypto.randomUUID();
	const bucket = BUCKETS.documents;
	const filePath = buildStoragePath(context.ownerUserId, input, documentId);

	try {
		await storage.upload(bucket, filePath, input.file, {
			upsert: false,
			contentType: input.file.type || 'application/octet-stream',
		});
	} catch {
		throw new DocumentsError(500, 'Error al subir el archivo');
	}

	const now = new Date().toISOString();

	try {
		await insertDocumentWithLink(
			documentsDb,
			bucket,
			filePath,
			{
				id: documentId,
				document_type_id: resolvedDocumentTypeId,
				document_request_id: input.documentRequestId ?? null,
				file_name: input.file.name,
				bucket_path: filePath,
				bucket_storage: bucket,
				file_size_bytes: input.file.size,
				file_title: input.file.name,
				mime_type: input.file.type || null,
				status: 'uploaded',
				is_signed: input.isSigned ?? false,
				version: 1,
				uploaded_by: actor.userId,
				uploaded_at: now,
				created_by: actor.userId,
				created_at: now,
				updated_by: actor.userId,
				updated_at: now,
			},
			{
				id: crypto.randomUUID(),
				document_id: documentId,
				related_to_type: input.relatedToType,
				related_to_id: input.relatedToId,
				relation_purpose: 'owner',
				created_by: actor.userId,
				created_at: now,
			},
		);
	} catch {
		throw new DocumentsError(500, 'Error guardando documento');
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
		event_type: 'uploaded',
		to_status: 'uploaded',
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
		metadata: {
			document_request_id: input.documentRequestId ?? null,
			shared_with_client: input.autoShare,
			related_to_type: input.relatedToType,
			related_to_id: input.relatedToId,
		},
	});

	// El share es ahora el único mecanismo de visibilidad para el cliente.
	if (actor.isStaff && input.autoShare) {
		const targetUserId = input.shareWithUserId ?? context.ownerUserId;

		await documentsDb.from('document_shares').upsert(
			{
				document_id: documentId,
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
				case_name: context.caseName ?? 'tu empresa',
				action_url: context.caseId
					? clientDocumentsPath(context.caseId)
					: `/admin/companies/${input.relatedToId}/documents`,
			},
		});

		if (context.caseId) {
			await sendDocumentSharedEmail({
				caseId: context.caseId,
				actionUrl: clientDocumentsPath(context.caseId),
			}).catch((error) => {
				console.error('[business-email][documents.shared] auto-share failed', {
					caseId: context.caseId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}

	return {
		documentId,
		caseId: context.caseId,
		ownerUserId: context.ownerUserId,
		caseName: context.caseName,
	};
}

export async function createDocumentRequest(
	actor: DocumentActor,
	input: CreateDocumentRequestInput,
): Promise<CreateDocumentRequestResult> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const context = await resolveCaseOwnerFromContext(
		input.relatedToType,
		input.relatedToId,
		input.caseId,
	);

	const now = new Date().toISOString();
	const requestId = crypto.randomUUID();

	const { error: requestErr } = await documentsDb
		.from('document_requests')
		.insert({
			id: requestId,
			case_id: context.caseId,
			document_type_id: input.documentTypeId,
			status: input.status ?? 'sent',
			requested_by: actor.userId,
			due_date: input.dueDate ?? null,
			message: input.message ?? null,
			is_required: input.isRequired ?? true,
			requested_at: now,
			created_at: now,
			updated_at: now,
		});

	if (requestErr) {
		throw new DocumentsError(500, 'No se pudo crear la solicitud');
	}

	const { error: linkErr } = await documentsDb
		.from('document_request_links')
		.insert({
			id: crypto.randomUUID(),
			document_request_id: requestId,
			related_to_type: input.relatedToType,
			related_to_id: input.relatedToId,
			relation_purpose: 'owner',
			created_by: actor.userId,
			created_at: now,
		});

	if (linkErr) {
		throw new DocumentsError(500, 'No se pudo enlazar la solicitud');
	}

	if (context.caseId) {
		await sendDocumentRequestedEmail({
			caseId: context.caseId,
			actionUrl: clientDocumentsPath(context.caseId),
			message: input.message ?? null,
			dueDate: input.dueDate ?? null,
		}).catch((error) => {
			console.error('[business-email][documents.requested] failed', {
				caseId: context.caseId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	return {
		requestId,
		caseId: context.caseId,
	};
}

/**
 * Cancela una solicitud de documentos. `cancelled` es el estado de archivado
 * de las solicitudes desde que se retiró el soft-delete, y hasta ahora era
 * inalcanzable desde la aplicación: una solicitud mal creada se quedaba en el
 * listado para siempre.
 */
export async function cancelDocumentRequest(
	actor: DocumentActor,
	documentRequestId: string,
): Promise<{ requestId: string; status: string }> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: requestRow, error: readErr } = await documentsDb
		.from('document_requests')
		.select('id, status')
		.eq('id', documentRequestId)
		.maybeSingle();

	if (readErr) {
		throw new DocumentsError(500, 'Error cargando solicitud');
	}

	if (!requestRow) {
		throw new DocumentsError(404, 'Solicitud no encontrada');
	}

	if (requestRow.status === 'cancelled') {
		return { requestId: documentRequestId, status: 'cancelled' };
	}

	if (requestRow.status === 'approved') {
		throw new DocumentsError(
			409,
			'No se puede cancelar una solicitud ya aprobada',
		);
	}

	const { error: updateErr } = await documentsDb
		.from('document_requests')
		.update({ status: 'cancelled', updated_at: new Date().toISOString() })
		.eq('id', documentRequestId);

	if (updateErr) {
		throw new DocumentsError(500, 'No se pudo cancelar la solicitud');
	}

	return { requestId: documentRequestId, status: 'cancelled' };
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
				file_name,
				file_title,
				bucket_path,
				file_size_bytes,
				mime_type,
				status,
				uploaded_at,
				created_at,
				document_request_id,
				document_types:document_type_id (
					id,
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
		(
			(links ?? []) as unknown as Array<{
				documents?: Record<string, unknown> | null;
			}>
		)
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
			const isVisibleForClient = activeShares.some(
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
		.select('id, bucket_path, file_name, status')
		.eq('id', documentId)
		.maybeSingle();

	if (docErr) {
		throw new DocumentsError(500, 'Error consultando documento');
	}

	if (!doc || doc.status === 'archived') {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	// El share activo es la única autorización de cliente.
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

	let signedUrl: string;
	try {
		signedUrl = await storage.createSignedUrl(
			BUCKETS.documents,
			doc.bucket_path,
			{
				expiresIn: DEFAULT_SIGNED_URL_TTL_SECONDS,
				download: doc.file_name,
			},
		);
	} catch {
		throw new DocumentsError(500, 'Error generando enlace');
	}

	await documentsDb.from('document_events').insert({
		document_id: documentId,
		event_type: 'downloaded',
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
		metadata: {
			signed_url_ttl_seconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
		},
	});

	return signedUrl;
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
		.select('id')
		.eq('id', documentId)
		.maybeSingle();

	if (docErr || !doc) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	const resolvedCaseId = await resolveCaseIdForDocument(documentId);
	if (!resolvedCaseId) {
		throw new DocumentsError(404, 'Caso no encontrado');
	}

	const { data: caseRow, error: caseErr } = await supabaseAdmin
		.from('incorporations')
		.select('id, user_id, principal_name')
		.eq('id', resolvedCaseId)
		.maybeSingle();

	if (caseErr || !caseRow) {
		throw new DocumentsError(404, 'Caso no encontrado');
	}

	const targetUserId = sharedWithUserId || caseRow.user_id;
	const now = new Date().toISOString();

	// Ya no hay que tocar el documento: crear el share ES conceder el acceso.
	const { error: shareErr } = await documentsDb.from('document_shares').upsert(
		{
			document_id: documentId,
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
			case_name: caseRow.principal_name ?? 'tu incorporacion',
			action_url: clientDocumentsPath(resolvedCaseId),
		},
	});

	await sendDocumentSharedEmail({
		caseId: resolvedCaseId,
		actionUrl: clientDocumentsPath(resolvedCaseId),
	}).catch((error) => {
		console.error('[business-email][documents.shared] manual-share failed', {
			caseId: resolvedCaseId,
			error: error instanceof Error ? error.message : String(error),
		});
	});

	return {
		caseId: resolvedCaseId,
		sharedWithUserId: targetUserId,
	};
}

export async function revokeDocumentShare(
	actor: DocumentActor,
	documentId: string,
	sharedWithUserId?: string,
): Promise<{ caseId: string | null; revokedCount: number }> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: doc, error: docErr } = await documentsDb
		.from('documents')
		.select('id')
		.eq('id', documentId)
		.maybeSingle();

	if (docErr || !doc) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	const resolvedCaseId = await resolveCaseIdForDocument(documentId);
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
				// El caso puede no ser resoluble (documento sin link a una
				// incorporación); en ese caso se enlaza al listado.
				action_url: resolvedCaseId
					? clientDocumentsPath(resolvedCaseId)
					: '/incorporation',
			},
		});
	}

	return {
		caseId: resolvedCaseId,
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

	// Use the view that joins document_events with public.usuarios in a single
	// query — avoids a separate batch lookup for actor names (no N+1).
	const { data: events, error } = await documentsDb
		.from('document_events_with_actors')
		.select(
			'id, event_type, actor_user_id, actor_role, actor_name, notes, created_at',
		)
		.eq('document_id', documentId)
		.order('created_at', { ascending: false })
		.limit(20);

	if (error) {
		throw new DocumentsError(500, 'No se pudo obtener el historial');
	}

	return events ?? [];
}

/**
 * Aprueba o rechaza una SOLICITUD de documentos.
 *
 * La revisión vive en la solicitud, no en el documento. Antes se aprobaba
 * documento a documento y cada aprobación arrastraba la solicitud entera: con
 * tres archivos respondiendo a una misma solicitud, el primero que se aprobaba
 * la daba por cerrada. La unidad de decisión es "¿me sirve lo que entregó el
 * cliente para esta solicitud?", y eso es una sola respuesta.
 *
 * La auditoría sigue siendo por documento —document_events cuelga de
 * documents.documents— así que se registra un evento por cada archivo de la
 * solicitud, con el id de la solicitud en `metadata`.
 */
export async function reviewDocumentRequest(
	actor: DocumentActor,
	documentRequestId: string,
	nextStatus: 'approved' | 'rejected',
	comments?: string,
): Promise<{
	documentRequestId: string;
	status: string;
	reviewedDocuments: number;
}> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: request, error: reqErr } = await documentsDb
		.from('document_requests')
		.select('id, status')
		.eq('id', documentRequestId)
		.maybeSingle();

	if (reqErr) {
		throw new DocumentsError(500, 'Error consultando la solicitud');
	}

	if (!request || request.status === 'cancelled') {
		throw new DocumentsError(404, 'Solicitud no encontrada');
	}

	const { data: files, error: filesErr } = await documentsDb
		.from('documents')
		.select('id, status')
		.eq('document_request_id', documentRequestId)
		.neq('status', 'archived');

	if (filesErr) {
		throw new DocumentsError(500, 'Error consultando los documentos');
	}

	if (!files || files.length === 0) {
		throw new DocumentsError(
			409,
			'La solicitud no tiene documentos que revisar',
		);
	}

	const now = new Date().toISOString();

	const { error: updateErr } = await documentsDb
		.from('document_requests')
		.update({ status: nextStatus, updated_at: now })
		.eq('id', documentRequestId);

	if (updateErr) {
		throw new DocumentsError(500, 'No se pudo actualizar la solicitud');
	}

	const reviewComments = comments?.trim() || null;
	await documentsDb.from('document_events').insert(
		files.map((file) => ({
			document_id: file.id,
			event_type: nextStatus,
			actor_user_id: actor.userId,
			actor_role: actor.actorRole,
			from_status: request.status,
			to_status: nextStatus,
			notes: reviewComments,
			metadata: {
				document_request_id: documentRequestId,
				reviewed_at_request_level: true,
			},
		})),
	);

	return {
		documentRequestId,
		status: nextStatus,
		reviewedDocuments: files.length,
	};
}

/**
 * Archiva o desarchiva un documento.
 *
 * `status = 'archived'` es el soft-delete del modelo desde que se retiraron
 * `deleted_at`/`deleted_by`: el documento desaparece de los listados pero
 * conserva su fila, su archivo, sus enlaces y su bitácora. Es reversible.
 *
 * Los event_type 'deleted' y 'restored' del enum se diseñaron para el antiguo
 * soft-delete, así que son exactamente los que corresponden aquí.
 */
export async function setDocumentArchived(
	actor: DocumentActor,
	documentId: string,
	archived: boolean,
): Promise<{ documentId: string; status: string }> {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'No autorizado');
	}

	const { data: doc, error: readErr } = await documentsDb
		.from('documents')
		.select('id, status')
		.eq('id', documentId)
		.maybeSingle();

	if (readErr) {
		throw new DocumentsError(500, 'Error consultando documento');
	}

	if (!doc) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	const isArchived = doc.status === 'archived';
	if (isArchived === archived) {
		return { documentId, status: doc.status };
	}

	// Al desarchivar se vuelve a 'uploaded': el estado previo no se conserva
	// (archivar no lo guarda), y 'uploaded' es el punto neutro del ciclo.
	const nextStatus = archived ? 'archived' : 'uploaded';
	const now = new Date().toISOString();

	const { error: updateErr } = await documentsDb
		.from('documents')
		.update({ status: nextStatus, updated_by: actor.userId, updated_at: now })
		.eq('id', documentId);

	if (updateErr) {
		throw new DocumentsError(500, 'No se pudo actualizar el documento');
	}

	await documentsDb.from('document_events').insert({
		document_id: documentId,
		event_type: archived ? 'deleted' : 'restored',
		from_status: doc.status,
		to_status: nextStatus,
		actor_user_id: actor.userId,
		actor_role: actor.actorRole,
	});

	return { documentId, status: nextStatus };
}

/**
 * Elimina un documento de forma permanente: la fila y el archivo del bucket.
 *
 * Irreversible, y además destruye la auditoría: document_links,
 * document_shares y document_events cuelgan con ON DELETE CASCADE. Por eso
 * queda restringido a admin y se deja constancia en el log del servidor, que
 * es el único rastro que sobrevive al borrado.
 *
 * Orden deliberado: primero la fila, después el archivo. Si fallara el
 * segundo paso queda un objeto huérfano en el bucket —detectable y sin efecto
 * en la aplicación—; al revés quedaría una fila apuntando a un archivo que ya
 * no existe, que sí rompe la vista del usuario.
 */
export async function deleteDocument(
	actor: DocumentActor,
	documentId: string,
): Promise<{ documentId: string }> {
	if (actor.actorRole !== 'admin') {
		throw new DocumentsError(
			403,
			'Solo un administrador puede eliminar documentos',
		);
	}

	const { data: doc, error: readErr } = await documentsDb
		.from('documents')
		.select('id, file_name, bucket_storage, bucket_path, document_type_id')
		.eq('id', documentId)
		.maybeSingle();

	if (readErr) {
		throw new DocumentsError(500, 'Error consultando documento');
	}

	if (!doc) {
		throw new DocumentsError(404, 'Documento no encontrado');
	}

	// Único rastro que sobrevive: la bitácora del documento se va con él.
	log.warn('borrado permanente de documento', {
		documentId,
		fileName: doc.file_name,
		bucket: doc.bucket_storage,
		bucketPath: doc.bucket_path,
		documentTypeId: doc.document_type_id,
		actorUserId: actor.userId,
		actorRole: actor.actorRole,
	});

	const { error: deleteErr } = await documentsDb
		.from('documents')
		.delete()
		.eq('id', documentId);

	if (deleteErr) {
		throw new DocumentsError(500, 'No se pudo eliminar el documento');
	}

	try {
		await storage.remove(doc.bucket_storage, [doc.bucket_path]);
	} catch (error) {
		// La fila ya no existe; el archivo queda huérfano pero no rompe nada.
		log.error('fila eliminada pero el archivo sigue en el bucket', {
			documentId,
			bucket: doc.bucket_storage,
			bucketPath: doc.bucket_path,
			error,
		});
	}

	return { documentId };
}

export function toJsonErrorResponse(error: unknown): Response {
	if (error instanceof DocumentsError) {
		return jsonResponse({ error: error.message }, error.status);
	}

	return jsonResponse({ error: 'Error inesperado' }, 500);
}
