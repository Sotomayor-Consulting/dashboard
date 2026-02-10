import { supabase } from '@lib/supabase';

export const getSociosByEmpresa = async (empresaId: string) => {
	const { data, error } = await supabase
		.from('socios_validados')
		.select('*')
		.eq('id_empresa', empresaId);
	
	if (error) {
		console.error('Error fetching socios:', error);
		throw error;
	}
	
	return data;
};

export const getAllSocios = async () => {
	const { data, error } = await supabase
		.from('socios_validados')
		.select('*');
	
	if (error) {
		console.error('Error fetching all socios:', error);
		throw error;
	}
	
	return data;
};

export const getSocioById = async (id: string) => {
	const { data, error } = await supabase
		.from('socios_validados')
		.select('*')
		.eq('id', id)
		.single();
	
	if (error) {
		console.error('Error fetching socio by ID:', error);
		throw error;
	}
	
	return data;
};