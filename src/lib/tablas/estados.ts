import { supabase } from '@lib/supabase';

export const EstadosGeneral = async () => {
	const { data, error } = await supabase.from('estados').select('*');

	if (error) {
		console.error('Error fetching all estados:', error);
		throw error;
	}

	return data;
};

export const getEstadoPorEmpresa = async (estado: string) => {
	const { data, error } = await supabase
		.from('estados')
		.select('abreviatura, Estado')
		.eq('Estado', estado)
		.single();
	if (error) {
		console.error('Error fetching estado por empresa:', error);
		throw error;
	}

	return data;
};
