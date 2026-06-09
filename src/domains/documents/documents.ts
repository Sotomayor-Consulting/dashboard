import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.documents');

export const getDocumentosGenerales = async (
	supabase: SupabaseClient,
	UserId: string,
) => {
	const { data, error } = await supabase
		.from('documentos_usuarios')
		.select('*')
		.eq('user_id', UserId);
	if (error) {
		log.error('Error fetching documentos', { error });
		throw error;
	}

	return data;
};
