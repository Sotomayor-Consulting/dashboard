import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.pending-signature');

export const getDocumentosPorFirmar = async (
	supabase: SupabaseClient,
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
		log.error('Error fetching documentos por firmar', { error });
		throw error;
	}

	return data;
};
