import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.document_dashboard');

export interface DocumentTypeLite {
	id: number;
	code: number;
	name: string;
	legal_category: string;
	applies_to: string;
	description: string | null;
	is_active: boolean;
	is_expirable: boolean;
	requires_approval: boolean;
}

export interface DocumentRequestDashboardRow {
	id: string;
	status: string;
	due_date: string | null;
	message: string | null;
	is_required: boolean;
	requested_at: string | null;
	document_type: DocumentTypeLite | null;
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
	visibility: 'internal_only' | 'client_visible' | string;
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
		.order('code', { ascending: true });

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
				deleted_at,
				document_types:document_type_id (
					id,
					code,
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
	return rows
		.map((r) => r?.document_requests)
		.filter((dr) => dr && !dr.deleted_at)
		.map((dr) => ({
			id: dr.id,
			status: dr.status,
			due_date: dr.due_date ?? null,
			message: dr.message ?? null,
			is_required: !!dr.is_required,
			requested_at: dr.requested_at ?? null,
			document_type: dr.document_types
				? {
						id: dr.document_types.id,
						code: dr.document_types.code,
						name: dr.document_types.name,
						legal_category: dr.document_types.legal_category,
						applies_to: dr.document_types.applies_to,
						description: dr.document_types.description ?? null,
						is_active: !!dr.document_types.is_active,
						is_expirable: !!dr.document_types.is_expirable,
						requires_approval: !!dr.document_types.requires_approval,
					}
				: null,
		}));
}

export async function getDocumentsForIncorporationCase(
	supabase: SupabaseClient,
	incorporationCaseId: string,
	currentUserId?: string | null,
	userRoles: string[] = [],
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
				visibility,
				created_at,
				uploaded_at,
				uploaded_by,
				notes,
				issue_date,
				expiry_date,
				deleted_at,
				document_shares:document_shares!left (
					id,
					shared_with_user_id,
					share_status,
					shared_at
				),
				document_types:document_type_id (
					id,
					code,
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
		log.error('Error fetching documents', { error });
		throw error;
	}

	const rows = (data as any[]) ?? [];
	return rows
		.map((r) => r?.documents)
		.filter((d) => d && !d.deleted_at)
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
			visibility: d.visibility ?? 'internal_only',
			shares: (d.document_shares ?? []).map((share: any) => ({
				id: share.id,
				shared_with_user_id: share.shared_with_user_id,
				share_status: share.share_status,
				shared_at: share.shared_at ?? null,
			})),
			document_type: d.document_types
				? {
						id: d.document_types.id,
						code: d.document_types.code,
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
			if (doc.visibility !== 'client_visible') return false;
			return doc.shares.some(
				(share: any) =>
					share.shared_with_user_id === currentUserId &&
					share.share_status === 'active',
			);
		});
}
