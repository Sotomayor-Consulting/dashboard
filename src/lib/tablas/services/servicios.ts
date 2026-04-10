import type { SupabaseClient } from '@supabase/supabase-js';

export const ListaServiciosGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('servicios')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });
	if (error) {
		console.error('Error fetching todos servicios:', error);
		throw error;
	}

	return data;
};

export const ListaServiciosStripe = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('servicios')
		.select(
			`
		*
	`,
		)
		.eq('servicio_activo', true)
		.in('id', [1, 2, 3, 4]);
	if (error) {
		console.error('Error fetching servicios de para pago:', error);
		throw error;
	}

	return data;
};

export const getServicioUpgrade = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase.from('servicios').select('id_servicios, nombre, precio').eq('nombre', 'Upgrade').eq('servicio_activo', true).maybeSingle();
	if (error) {
		console.error('Error fetching servicios upgrade para pago:', error);
		throw error;
	}

	return data;
}
