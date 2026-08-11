import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.document_dashboard');

export interface DocumentTypeLite {
	id: number;
	name: string;
	legal_category: string;
	applies_to: string;
	description: string | null;
	is_active: boolean;
	is_expirable: boolean;
	requires_approval: boolean;
}

/** Documento subido en respuesta a una solicitud. */
export interface DocumentRequestFile {
	id: string;
	file_name: string;
	file_title: string | null;
	mime_type: string | null;
	status: string;
	uploaded_at: string | null;
}

export interface DocumentRequestDashboardRow {
	id: string;
	status: string;
	due_date: string | null;
	message: string | null;
	is_required: boolean;
	requested_at: string | null;
	document_type: DocumentTypeLite | null;
	/**
	 * Una solicitud admite N documentos: el FK vive en
	 * documents.documents.document_request_id, así que la relación es
	 * solicitud 1 → N documentos.
	 */
	documents: DocumentRequestFile[];
}

export interface DocumentDashboardRow {
	id: string;
	status: string;
	file_name: string;
	file_title: string | null;
	mime_type: string | null;
	file_size_bytes: number | null;
	bucket_path: string;
	created_at: string | null;
	uploaded_at: string | null;
	uploaded_by: string | null;
	notes: string | null;
	issue_date: string | null;
	expiry_date: string | null;
	document_request_id: string | null;
	is_signed: boolean;
	shares: Array<{
		id: string;
		shared_with_user_id: string;
		share_status: string;
		shared_at: string | null;
	}>;
	document_type: DocumentTypeLite | null;
}

const STAFF_ROLES = new Set(['admin', 'operaciones']);

export async function getDocumentTypesList(
	supabase: SupabaseClient,
): Promise<DocumentTypeLite[]> {
	const documentsDb = supabase.schema('documents');
	const { data, error } = await documentsDb
		.from('document_types')
		.select('*')
		.order('legal_category', { ascending: true })
		.order('name', { ascending: true });

	if (error) {
		log.error('Error fetching document_types', { error });
		throw error;
	}

	return (data ?? []) as DocumentTypeLite[];
}

export async function getDocumentRequestsForIncorporationCase(
	supabase: SupabaseClient,
	incorporationCaseId: string,
): Promise<DocumentRequestDashboardRow[]> {
	const documentsDb = supabase.schema('documents');
	const { data, error } = await documentsDb
		.from('document_request_links')
		.select(
			`
			id,
			document_requests:document_request_id (
				id,
				status,
				due_date,
				message,
				is_required,
				requested_at,
				document_types:document_type_id (
					id,
					name,
					legal_category,
					applies_to,
					description,
					is_active,
					is_expirable,
					requires_approval
				)
			)
		`,
		)
		.eq('related_to_type', 'incorporation_case')
		.eq('related_to_id', incorporationCaseId)
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching document requests', { error });
		throw error;
	}

	const rows = (data as any[]) ?? [];
	const requests = rows
		.map((r) => r?.document_requests)
		.filter((dr) => dr && dr.status !== 'cancelled');

	// Los documentos que responden a cada solicitud se traen aparte y se
	// agrupan en JS: es más claro que un embed y evita depender del alias que
	// PostgREST derive del FK.
	const filesByRequest = await getFilesByRequest(
		documentsDb,
		requests.map((dr) => dr.id as string),
	);

	return requests.map((dr) => ({
		id: dr.id,
		status: dr.status,
		due_date: dr.due_date ?? null,
		message: dr.message ?? null,
		is_required: !!dr.is_required,
		requested_at: dr.requested_at ?? null,
		document_type: dr.document_types
			? {
					id: dr.document_types.id,
					name: dr.document_types.name,
					legal_category: dr.document_types.legal_category,
					applies_to: dr.document_types.applies_to,
					description: dr.document_types.description ?? null,
					is_active: !!dr.document_types.is_active,
					is_expirable: !!dr.document_types.is_expirable,
					requires_approval: !!dr.document_types.requires_approval,
				}
			: null,
		documents: filesByRequest.get(dr.id as string) ?? [],
	}));
}

async function getFilesByRequest(
	documentsDb: ReturnType<SupabaseClient['schema']>,
	requestIds: string[],
): Promise<Map<string, DocumentRequestFile[]>> {
	const grouped = new Map<string, DocumentRequestFile[]>();
	if (requestIds.length === 0) return grouped;

	const { data, error } = await documentsDb
		.from('documents')
		.select(
			'id, document_request_id, file_name, file_title, mime_type, status, uploaded_at',
		)
		.in('document_request_id', requestIds)
		.neq('status', 'archived')
		.order('uploaded_at', { ascending: false });

	if (error) {
		log.error('Error fetching documents for requests', { error });
		return grouped;
	}

	for (const row of (data ?? []) as any[]) {
		const requestId = row.document_request_id as string;
		const list = grouped.get(requestId) ?? [];
		list.push({
			id: row.id,
			file_name: row.file_name,
			file_title: row.file_title ?? null,
			mime_type: row.mime_type ?? null,
			status: row.status,
			uploaded_at: row.uploaded_at ?? null,
		});
		grouped.set(requestId, list);
	}

	return grouped;
}

export async function getDocumentsForIncorporationCase(
	supabase: SupabaseClient,
	incorporationCaseId: string,
	currentUserId?: string | null,
	userRoles: string[] = [],
	includeArchived = false,
): Promise<DocumentDashboardRow[]> {
	return getDocumentsForRelated(
		supabase,
		'incorporation_case',
		incorporationCaseId,
		currentUserId,
		userRoles,
		includeArchived,
	);
}

/** Documentos vinculados directamente a una empresa canónica (`companies`). */
export async function getDocumentsForCompany(
	supabase: SupabaseClient,
	companyId: string,
	currentUserId?: string | null,
	userRoles: string[] = [],
	includeArchived = false,
): Promise<DocumentDashboardRow[]> {
	return getDocumentsForRelated(
		supabase,
		'company',
		companyId,
		currentUserId,
		userRoles,
		includeArchived,
	);
}

/**
 * Documentos de una empresa vistos "de punta a punta": combina los vinculados
 * al caso de incorporación (`related_to_type = 'incorporation_case'') con los
 * vinculados directamente a la empresa canónica (`related_to_type = 'company'`).
 * La mayoría de los documentos importados (facturas, EIN, BOIR, etc.) se
 * enlazan como `company`, no como `incorporation_case`, así que ambas fuentes
 * son necesarias para que no falten documentos en el listado.
 */
export async function getDocumentsForCompanyView(
	supabase: SupabaseClient,
	companyId?: string | null,
	incorporationCaseId?: string | null,
	currentUserId?: string | null,
	userRoles: string[] = [],
	includeArchived = false,
): Promise<DocumentDashboardRow[]> {
	const [companyDocs, incorporationDocs] = await Promise.all([
		companyId
			? getDocumentsForCompany(
					supabase,
					companyId,
					currentUserId,
					userRoles,
					includeArchived,
				)
			: Promise.resolve([]),
		incorporationCaseId
			? getDocumentsForIncorporationCase(
					supabase,
					incorporationCaseId,
					currentUserId,
					userRoles,
					includeArchived,
				)
			: Promise.resolve([]),
	]);

	const byId = new Map<string, DocumentDashboardRow>();
	for (const doc of [...companyDocs, ...incorporationDocs]) {
		byId.set(doc.id, doc);
	}

	return [...byId.values()].sort((a, b) => {
		const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
		const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
		return bTime - aTime;
	});
}

async function getDocumentsForRelated(
	supabase: SupabaseClient,
	relatedToType: 'incorporation_case' | 'company',
	relatedToId: string,
	currentUserId?: string | null,
	userRoles: string[] = [],
	includeArchived = false,
): Promise<DocumentDashboardRow[]> {
	const documentsDb = supabase.schema('documents');
	const { data, error } = await documentsDb
		.from('document_links')
		.select(
			`
			id,
			documents:document_id (
				id,
				status,
				file_name,
				bucket_path,
				file_size_bytes,
				file_title,
				mime_type,
				document_request_id,
				is_signed,
				created_at,
				uploaded_at,
				uploaded_by,
				notes,
				issue_date,
				expiry_date,
				document_shares:document_shares!left (
					id,
					shared_with_user_id,
					share_status,
					shared_at
				),
				document_types:document_type_id (
					id,
					name,
					legal_category,
					applies_to,
					description,
					is_active,
					is_expirable,
					requires_approval
				)
			)
		`,
		)
		.eq('related_to_type', relatedToType)
		.eq('related_to_id', relatedToId)
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching documents', { error });
		throw error;
	}

	const rows = (data as any[]) ?? [];
	return (
		rows
			.map((r) => r?.documents)
			// Los archivados se excluyen salvo que el llamador los pida
			// explícitamente: el cliente no debe verlos nunca, pero el staff
			// necesita poder restaurarlos o eliminarlos definitivamente.
			.filter((d) => d && (includeArchived || d.status !== 'archived'))
			.map((d) => ({
				id: d.id,
				status: d.status,
				file_name: d.file_name,
				file_title: d.file_title ?? null,
				mime_type: d.mime_type ?? null,
				file_size_bytes: d.file_size_bytes ?? null,
				bucket_path: d.bucket_path,
				created_at: d.created_at ?? null,
				uploaded_at: d.uploaded_at ?? null,
				uploaded_by: d.uploaded_by ?? null,
				notes: d.notes ?? null,
				issue_date: d.issue_date ?? null,
				expiry_date: d.expiry_date ?? null,
				document_request_id: d.document_request_id ?? null,
				is_signed: !!d.is_signed,
				shares: (d.document_shares ?? []).map((share: any) => ({
					id: share.id,
					shared_with_user_id: share.shared_with_user_id,
					share_status: share.share_status,
					shared_at: share.shared_at ?? null,
				})),
				document_type: d.document_types
					? {
							id: d.document_types.id,
							name: d.document_types.name,
							legal_category: d.document_types.legal_category,
							applies_to: d.document_types.applies_to,
							description: d.document_types.description ?? null,
							is_active: !!d.document_types.is_active,
							is_expirable: !!d.document_types.is_expirable,
							requires_approval: !!d.document_types.requires_approval,
						}
					: null,
			}))
			.filter((doc) => {
				const isStaff = userRoles.some((role) => STAFF_ROLES.has(role));
				if (isStaff) return true;
				if (!currentUserId) return false;
				// El usuario siempre ve lo que él mismo subió (p. ej. al responder una
				// solicitud de documento), sin depender de un share explícito: el
				// auto-share al subir solo lo dispara staff (ver uploadDocument en
				// service.ts), así que sin esta excepción el cliente nunca vería sus
				// propias cargas.
				if (doc.uploaded_by === currentUserId) return true;
				return doc.shares.some(
					(share: any) =>
						share.shared_with_user_id === currentUserId &&
						share.share_status === 'active',
				);
			})
	);
}
