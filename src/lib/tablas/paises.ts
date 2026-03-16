import type { SupabaseClient } from '@supabase/supabase-js';

export const PaisesGeneral = async (supabase: SupabaseClient) => {
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
