import { supabase } from '@lib/supabase';

export const getPagosSurvey = async (empresaId: string) => {
	const { data, error } = await supabase
		.from('pagos')
		.select('status')
		.eq('empresa_incorporacion_id', empresaId)
		.eq('status', 'succeeded')
		.single();
	if (error) {
		console.log('Error fetching pagos para survey:', error);
		throw error;
	}
	return data;
};
