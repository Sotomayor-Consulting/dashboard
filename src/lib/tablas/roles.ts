import { supabase } from '@lib/supabase';

export const RolesGeneral = async () => {
	const { data, error } = await supabase
		.from('roles')
		.select('*')
		.order('id', { ascending: true });

	if (error) {
		if (error.code === 'PGRST116') return null;
		console.error('Error fetching all facturaciones:', error);
		throw error;
	}

	return data;
};
