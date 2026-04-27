export const STAFF_ROLES = new Set(['admin', 'operaciones']);

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export function getDocumentsBucket(): string {
	return (
		process.env.SUPABASE_DOCUMENTS_BUCKET ??
		import.meta.env.SUPABASE_DOCUMENTS_BUCKET ??
		'documents'
	);
}
