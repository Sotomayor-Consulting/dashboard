import { supabase } from '@lib/supabase';

export const ListaDeMicroServiciosActivos = async () => {
	const { data, error } = await supabase
		.from('micro_servicios')
		.select('*')
		.eq('estado', true);
	if (error) {
		console.error('Error fetching microservicios activos:', error);
		throw error;
	}

	return data;
};
