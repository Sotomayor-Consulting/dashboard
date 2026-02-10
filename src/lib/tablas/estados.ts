import { supabase } from '@lib/supabase';

export const EstadosGeneral = async () => {
	const { data, error } = await supabase.from('estados').select('*');

	if (error) {
		console.error('Error fetching all países:', error);
		throw error;
	}

	return data;
};
