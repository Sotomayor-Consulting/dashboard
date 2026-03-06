import { supabase } from '@lib/supabase';

export const getDocumentosPorFirmar = async (
	UserId: string,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.from('documentos_por_firmar')
		.select('*')
		.eq('user_id', UserId)
		.eq('empresa_incorporacion_id', empresaId)
		.eq('status', 'Pendiente_a_firma');
	if (error) {
		console.error('Error fetching documentos por firmar:', error);
		throw error;
	}

	return data;
};
