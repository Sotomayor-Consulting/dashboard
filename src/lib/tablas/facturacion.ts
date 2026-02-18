import { supabase } from '@lib/supabase';

export const FacturacionGeneral = async () => {
	const { data, error } = await supabase
		.from('datos_facturacion')
		.select('*')
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		console.error('Error fetching all facturaciones:', error);
		throw error;
	}

	return data;
};

export const FacturacionbyId = async (userId: string) => {
	const { data, error } = await supabase
		.from('datos_facturacion')
		.select('*')
		.eq('user_id', userId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		console.error('Error fetching all facturaciones:', error);
		throw error;
	}

	return data;
};
