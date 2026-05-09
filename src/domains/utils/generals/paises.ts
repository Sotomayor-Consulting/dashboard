import type { SupabaseClient } from '@supabase/supabase-js';

export const PaisesGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('countries')
		.select('*')
		.order('name', { ascending: true });

	if (error) {
		console.error('Error fetching all countries:', error);
		throw error;
	}

	return data;
};
