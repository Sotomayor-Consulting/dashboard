import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.payments.orders');

export interface OrderLineItem {
	service_name: string | null;
	service_plan_name: string | null;
	unit_price?: number | null; // solo presente si show_prices = true
	quantity: number | null;
}

export interface OrderAdminRow {
	id: string;
	order_number: string;
	status: string;
	currency: string;
	seen_by_ops: boolean;
	created_at: string;
	user_id: string | null;
	client_name: string | null;
	client_email: string | null;
	incorporation_id: string | null;
	incorporation_name: string | null;
	plan_slug: string | null;
	plan_name: string | null;
	show_prices: boolean;
	provider_transaction_id: string | null;
	payment_status: string | null;
	paid_at: string | null;
	total: number | null; // null cuando show_prices = false
	lines: OrderLineItem[];
}

function mapOrderRows(data: unknown[]): OrderAdminRow[] {
	return (data ?? []).map((r) => {
		const row = r as Partial<OrderAdminRow> & { lines?: OrderLineItem[] | null };
		return {
			id: row.id ?? '',
			order_number: row.order_number ?? '',
			status: row.status ?? 'draft',
			currency: row.currency ?? 'usd',
			seen_by_ops: row.seen_by_ops === true,
			created_at: row.created_at ?? '',
			user_id: row.user_id ?? null,
			client_name: row.client_name ?? null,
			client_email: row.client_email ?? null,
			incorporation_id: row.incorporation_id ?? null,
			incorporation_name: row.incorporation_name ?? null,
			plan_slug: row.plan_slug ?? null,
			plan_name: row.plan_name ?? null,
			show_prices: row.show_prices === true,
			provider_transaction_id: row.provider_transaction_id ?? null,
			payment_status: row.payment_status ?? null,
			paid_at: row.paid_at ?? null,
			total: typeof row.total === 'number' ? row.total : null,
			lines: Array.isArray(row.lines) ? row.lines : [],
		};
	});
}

// Lee la vista agregada orders.order_admin_details (joins en SQL, sin embeds
// cross-schema). RLS: staff ve todas; cliente ve las suyas.
export async function getOrdersForAdmin(
	supabase: SupabaseClient,
): Promise<OrderAdminRow[]> {
	const { data, error } = await supabase
		.schema('orders')
		.from('order_admin_details')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching orders for admin', { error });
		throw error;
	}

	return mapOrderRows(data ?? []);
}

export async function getOrdersByUser(
	supabase: SupabaseClient,
): Promise<OrderAdminRow[]> {
	const { data, error } = await supabase
		.schema('orders')
		.from('order_admin_details')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching orders for user', { error });
		throw error;
	}

	return mapOrderRows(data ?? []);
}

// Órdenes de una incorporación (vista cliente). RLS security_invoker filtra a
// las del propio usuario; se ordena por más recientes.
export async function getOrdersByIncorporation(
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<OrderAdminRow[]> {
	const { data, error } = await supabase
		.schema('orders')
		.from('order_admin_details')
		.select('*')
		.eq('incorporation_id', incorporationId)
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching orders by incorporation', {
			error,
			incorporationId,
		});
		throw error;
	}

	return mapOrderRows(data ?? []);
}
