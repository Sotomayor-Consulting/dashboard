import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.pending-signature');

export interface PendingSignatureDoc {
	id: string;
	nombre: string;
	storage_path: string;
}

/**
 * Documentos pendientes de firma de un caso de incorporación.
 * Reemplaza la tabla legacy `documentos_por_firmar`: ahora un documento
 * "por firmar" es un `documents.documents` enlazado con
 * `relation_purpose='signature'` al `incorporation_case` y con
 * `status='pending'` (pasa a `'uploaded'` cuando el cliente sube el firmado,
 * ver api/documents/upload-signed.ts).
 */
export const getDocumentosPorFirmar = async (
	_supabase: SupabaseClient,
	_userId: string,
	empresaId: string,
): Promise<PendingSignatureDoc[]> => {
	const documentsDb = supabaseAdmin.schema('documents');

	const { data: links, error: linksError } = await documentsDb
		.from('document_links')
		.select('document_id')
		.eq('related_to_type', 'incorporation_case')
		.eq('related_to_id', empresaId)
		.eq('relation_purpose', 'signature');

	if (linksError) {
		log.error('Error fetching signature links', { error: linksError });
		throw linksError;
	}

	const ids = (links ?? []).map((l) => l.document_id as string);
	if (ids.length === 0) return [];

	const { data, error } = await documentsDb
		.from('documents')
		.select('id, file_name, file_title, bucket_path, status')
		.in('id', ids)
		.eq('status', 'pending')
		.is('deleted_at', null)
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching documentos por firmar', { error });
		throw error;
	}

	return (data ?? []).map((d) => ({
		id: d.id as string,
		nombre: (d.file_title as string | null) ?? (d.file_name as string),
		storage_path: d.bucket_path as string,
	}));
};
