import type { SupabaseClient } from '@supabase/supabase-js';

export interface PagoPorLeer {
	id: string;
	status: string;
	visto_por_operaciones: boolean;
	created_at: string;
	monto: number;
	moneda: string;
	usuarios?: {
		user_id: string;
		nombre: string;
		apellido: string;
	};
}

export async function getPagosPorLeer(
	supabase: SupabaseClient,
	userRole?: string,
): Promise<{
	count: number;
	data: PagoPorLeer[];
}> {
	let pagosCount = 0;
	let pagosData: PagoPorLeer[] = [];

	if (userRole === 'admin') {
		const { data: pagos } = await supabase
			.from('pagos')
			.select(
				`
        *,
        usuarios:usuarios (user_id, nombre, apellido)
      `,
			)
			.eq('status', 'succeeded')
			.eq('visto_por_operaciones', false)
			.order('created_at', { ascending: true });

		pagosData = pagos || [];
		pagosCount = pagos?.length || 0;
	}

	return { count: pagosCount, data: pagosData };
}

export const pagosRealizadosData = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('pagos')
		.select(
			`
    *,
    usuarios ( user_id, nombre, apellido, correo ),
	servicios (id_servicios, nombre, categoria),
	empresas_incorporaciones (empresa_incorporacion_id, nombre_1, estado)
  `,
			{ count: 'exact' },
		)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching all pagos data:', error);
		throw error;
	}

	return data;
};

export const pagosRealizadosPorSubir = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('pagos')
		.select(
			`
    *,
    usuarios ( user_id, nombre, apellido, correo ),
	servicios (id_servicios, nombre, categoria),
	empresas_incorporaciones (empresa_incorporacion_id, nombre_1, estado)
  `,
			{ count: 'exact' },
		)
		.eq('status', 'succeeded')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching all pagos data:', error);
		throw error;
	}

	return data;
};

export const pagosRealizadosPorSubirById = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.from('pagos')
		.select(
			`
    *,
    usuarios ( user_id, nombre, apellido, correo ),
	servicios (id_servicios, nombre, categoria),
	empresas_incorporaciones (empresa_incorporacion_id, nombre_1, estado, tipo_de_negocio)
  `,
			{ count: 'exact' },
		)
		.eq('status', 'succeeded')
		.eq('empresa_incorporacion_id', empresaId)
		.order('created_at', { ascending: false })
		.maybeSingle();

	if (error) {
		console.error('Error fetching all pagos data:', error);
		throw error;
	}

	return data;
};

export const pagosPorSubirById = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.from('pagos')
		.select(
			`
    *,
    usuarios ( user_id, nombre, apellido, correo ),
	servicios (id_servicios, nombre, categoria),
	
  `,
			{ count: 'exact' },
		)
		.eq('status', 'succeeded')
		.eq('empresa_incorporacion_id', empresaId)
		.order('created_at', { ascending: false })
		.single();

	if (error) {
		console.error('Error fetching all pagos data:', error);
		throw error;
	}

	return data;
};