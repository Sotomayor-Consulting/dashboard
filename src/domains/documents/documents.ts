import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.documents');

/**
 * Documentos asociados a un usuario (ej. contrato de partner).
 * Reemplaza la tabla legacy `documentos_usuarios`: ahora lee del schema
 * `documents` (documents + document_links con related_to_type='user').
 * Devuelve la forma que consume PartnersView (`nombre_archivo`, `estado`...).
 */
export const getDocumentosGenerales = async (
	_supabase: SupabaseClient,
	UserId: string,
) => {
	const documentsDb = supabaseAdmin.schema('documents');

	const { data: links, error: linksError } = await documentsDb
		.from('document_links')
		.select('document_id')
		.eq('related_to_type', 'user')
		.eq('related_to_id', UserId);

	if (linksError) {
		log.error('Error fetching document_links', { error: linksError });
		throw linksError;
	}

	const ids = (links ?? []).map((l) => l.document_id as string);
	if (ids.length === 0) return [];

	const { data, error } = await documentsDb
		.from('documents')
		.select('id, file_name, status, created_at')
		.in('id', ids)
		.neq('status', 'archived')
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching documentos', { error });
		throw error;
	}

	return (data ?? []).map((d) => ({
		id: d.id as string,
		user_id: UserId,
		nombre_archivo: d.file_name as string,
		created_at: d.created_at as string,
		// PartnersView muestra "Activo" cuando estado === 'activo'.
		estado: d.status === 'approved' ? 'activo' : 'subido',
	}));
};
