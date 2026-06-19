import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.payments');

export const getPlanContratadoPorEmpresa = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.from('pagos')
		.select('created_at, servicios:servicio_id ( nombre )')
		.eq('empresa_incorporacion_id', empresaId)
		.eq('status', 'succeeded')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		log.error('Error fetching plan contratado', { error });
		return null;
	}

	return data as { created_at: string; servicios?: { nombre?: string | null } } | null;
};
