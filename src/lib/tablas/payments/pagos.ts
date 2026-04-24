import type { SupabaseClient } from '@supabase/supabase-js';

export const getPagosSurvey = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.from('pagos')
		.select('status')
		.eq('empresa_incorporacion_id', empresaId)
		.eq('status', 'succeeded')
		.limit(1)
		.maybeSingle();
	if (error) {
		console.log('Error fetching pagos para survey:', error);
		throw error;
	}
	return data;
};
