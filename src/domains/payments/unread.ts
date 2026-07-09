import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.payments.unread');

const ord = (s: SupabaseClient) => s.schema('orders' as never);

interface OrderAdminRow {
	id: string;
	order_number: string;
	status: string;
	seen_by_ops: boolean;
	created_at: string;
	total: number | null;
	user_id: string;
	client_name: string | null;
	client_email: string | null;
	incorporation_id: string | null;
	incorporation_name: string | null;
	plan_slug: string | null;
	plan_name: string | null;
	provider_transaction_id: string | null;
	payment_status: string | null;
	paid_at: string | null;
}

export const pagosRealizadosData = async (supabase: SupabaseClient) => {
	const { data, error } = await ord(supabase)
		.from('order_admin_details')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching pagos from order_admin_details', { error });
		throw error;
	}

	const rows = (data ?? []) as OrderAdminRow[];

	return rows.map((r) => {
		const [nombre, ...rest] = (r.client_name ?? '').split(' ');
		const apellido = rest.join(' ');

		return {
			id_pagos: null,
			stripe_payment_intent_id: r.provider_transaction_id,
			amount: r.total != null ? Math.round(r.total * 100) : null,
			status: r.payment_status ?? r.status,
			visto_por_operaciones: r.seen_by_ops,
			created_at: r.created_at,
			usuarios: { nombre: nombre ?? null, apellido: apellido || null },
			incorporations: {
				principal_name: r.incorporation_name,
				id: r.incorporation_id,
			},
			servicios: { nombre: r.plan_name },
		};
	});
};
