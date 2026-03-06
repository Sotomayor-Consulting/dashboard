import { supabase } from '@lib/supabase';

export const GetDocumentosPartner = async () => {
	const { data, error } = await supabase
		.from('documentos_usuarios')
		.select(`*`, { count: 'exact' })
		.order('created_at', { ascending: false });
	if (error) {
		console.error(
			'Error fetching documentos_usuarios contrato partners:',
			error,
		);
		throw error;
	}

	return data;
};
