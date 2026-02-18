import { supabase } from '@lib/supabase';

export const ListaServiciosGeneral = async () => {
	const { data, error } = await supabase
		.from('servicios')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });
	if (error) {
		console.error('Error fetching all países:', error);
		throw error;
	}

	return data;
};
