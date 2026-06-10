import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.user-documents');

export const GetDocumentosPartner = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('documentos_usuarios')
		.select(`*`, { count: 'exact' })
		.order('created_at', { ascending: false });
	if (error) {
		log.error('Error fetching documentos_usuarios contrato partners', {
			error,
		});
		throw error;
	}

	return data;
};
