// import type { SupabaseClient } from '@supabase/supabase-js';
// import { createLogger } from '@infrastructure/logging';

// const log = createLogger('domains.states');

// export const EstadosGeneral = async (supabase: SupabaseClient) => {
// 	const { data, error } = await supabase.from('estados').select('*');

// 	if (error) {
// 		log.error('Error fetching all estados', { error });
// 		throw error;
// 	}

// 	return data;
// };

// export const getEstadoPorEmpresa = async (
// 	supabase: SupabaseClient,
// 	estado: string,
// ) => {
// 	const { data, error } = await supabase
// 		.from('estados')
// 		.select('abreviatura, Estado')
// 		.eq('Estado', estado)
// 		.maybeSingle();
// 	if (error) {
// 		log.error('Error fetching estado por empresa', { error });
// 		return null;
// 	}

// 	return data;
// };
