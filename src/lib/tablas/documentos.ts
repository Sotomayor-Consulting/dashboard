import { supabase } from '@lib/supabase';

export const getDocumentosGenerales = async (UserId: string) => {
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
