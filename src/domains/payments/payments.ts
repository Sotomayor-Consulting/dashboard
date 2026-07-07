import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.payments');

export const getPlanContratadoPorEmpresa = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.schema('orders')
		.from('payments')
		.select(
			`created_at,
			 order:order_id!inner (
			   incorporation_id,
			   order_lines ( service_plan_id, service_plan_name )
			 )`,
		)
		.eq('status', 'succeeded')
		.eq('order.incorporation_id', empresaId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		log.error('Error fetching plan contratado', { error });
		return null;
	}

	if (!data) return null;

	const order = (
		data as unknown as {
			created_at: string;
			order: {
				order_lines?: Array<{
					service_plan_id: number | null;
					service_plan_name: string | null;
				}>;
			};
		}
	).order;
	const planLine = order?.order_lines?.find((l) => l.service_plan_id != null);

	return {
		created_at: (data as unknown as { created_at: string }).created_at,
		servicios: { nombre: planLine?.service_plan_name ?? null },
	} as {
		created_at: string;
		servicios?: { nombre?: string | null };
	};
};
