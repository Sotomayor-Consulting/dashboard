import { supabase } from '@lib/supabase';

export const getAllUsuarios = async () => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('*, paises ( id, nombre_paises )')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching all usuarios:', error);
		throw error;
	}

	return data;
};

export const getUsuarioById = async (userId: string) => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('*')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error fetching usuario by ID:', error);
		throw error;
	}

	return data;
};

export const getUsuarioAvatar = async (userId: string) => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('avatar_url')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error fetching usuario by ID:', error);
		throw error;
	}

	return data;
};
