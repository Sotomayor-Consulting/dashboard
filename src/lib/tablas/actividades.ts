import { supabase } from '@lib/supabase';

export const actividadesGeneral = async () => {
	const { data, error } = await supabase.from('actividades').select('*');

	if (error) {
		console.error('Error fetching all socios:', error);
		throw error;
	}

	return data;
};
