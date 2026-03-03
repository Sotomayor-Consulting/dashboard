import { supabase } from '@lib/supabase';

export const RolesGeneral = async () => {
	const { data, error } = await supabase
		.from('roles')
		.select('*')
		.order('id', { ascending: true });

	if (error) {
		if (error.code === 'PGRST116') return null;
		console.error('Error fetching all Roles:', error);
		throw error;
	}

	return data;
};

export const RolesGeneralUsers = async () => {
	const { data, error } = await supabase
		.from('user_roles')
		.select('*, roles (name)')
		.order('created_at', { ascending: true });

	if (error) {
		if (error.code === 'PGRST116') return null;
		console.error('Error fetching all user_roles:', error);
		throw error;
	}

	return data;
};
