import { supabase } from '@lib/supabase';

export const PaisesGeneral = async () => {
	const { data, error } = await supabase
		.from('paises')
		.select('*')
		.order('nombre_paises', { ascending: true });

	if (error) {
		console.error('Error fetching all países:', error);
		throw error;
	}

	return data;
};
