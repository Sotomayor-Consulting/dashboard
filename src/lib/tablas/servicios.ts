import { supabase } from '@lib/supabase';

export const ListaServiciosGeneral = async () => {
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

export const ListaServiciosStripe = async () => {
	const { data, error } = await supabase
		.from('servicios')
		.select(
			`
		id_servicios,
		nombre,
		precio,
		descripcion,
		categoria,
		servicio_activo
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
