import type { SupabaseClient } from '@supabase/supabase-js';

export const EstadosGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase.from('estados').select('*');

	if (error) {
		console.error('Error fetching all estados:', error);
		throw error;
	}

	return data;
};

export const getEstadoPorEmpresa = async (
	supabase: SupabaseClient,
	estado: string,
) => {
	const { data, error } = await supabase
		.from('estados')
		.select('abreviatura, Estado')
		.eq('Estado', estado)
		.maybeSingle();
	if (error) {
		console.error('Error fetching estado por empresa:', error);
		return null;
	}

	return data;
};
