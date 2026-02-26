import { supabase } from '@lib/supabase';

export const getManagerByEmpresa = async (empresaId: string) => {
	const { data, error } = await supabase
		.from('managers_validados')
		.select('*')
		.eq('empresa_incorporacion_id', empresaId);

	if (error) {
		console.error('Error fetching managers:', error);
		throw error;
	}

	return data;
};

export const getAllManagers = async () => {
	const { data, error } = await supabase.from('managers_validados').select('*');

	if (error) {
		console.error('Error fetching all managers:', error);
		throw error;
	}

	return data;
};

export const getManagerById = async (id: string) => {
	const { data, error } = await supabase
		.from('managers_validados')
		.select('*')
		.eq('id', id)
		.single();

	if (error) {
		console.error('Error fetching manager by ID:', error);
		throw error;
	}

	return data;
};
