import type { SupabaseClient } from '@supabase/supabase-js';

export const actividadesGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase.from('actividades').select('*');

	if (error) {
		console.error('Error fetching all socios:', error);
		throw error;
	}

	return data;
};
