import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.payments');

const ord = (s: SupabaseClient) => s.schema('orders' as never);

export const getPlanContratadoPorEmpresa = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await ord(supabase)
		.from('order_admin_details')
		.select('plan_slug, plan_name, payment_status, created_at')
		.eq('incorporation_id', empresaId)
		.eq('payment_status', 'succeeded')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		log.error('Error fetching plan contratado', { error });
		return null;
	}

	return data as {
		plan_slug: string | null;
		plan_name: string | null;
		payment_status: string | null;
		created_at: string;
	} | null;
};
