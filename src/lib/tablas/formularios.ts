import { supabase } from '@lib/supabase';

export const ListaFormulariosGeneral = async () => {
	const { data, error } = await supabase
		.from('formularios')
		.select('*', { count: 'exact' })
		.order('titulo', { ascending: false });
	if (error) {
		console.error('Error fetching all países:', error);
		throw error;
	}

	return data;
};
