import type { SupabaseClient } from '@supabase/supabase-js';

export const getDocumentosGenerales = async (
	supabase: SupabaseClient,
	UserId: string,
) => {
	const { data, error } = await supabase
		.from('documentos_usuarios')
		.select('*')
		.eq('user_id', UserId);
	if (error) {
		console.error('Error fetching documentos:', error);
		throw error;
	}

	return data;
};
