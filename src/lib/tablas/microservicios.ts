import type { SupabaseClient } from '@supabase/supabase-js';

export const ListaDeMicroServiciosActivos = async (
	supabase: SupabaseClient,
) => {
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
