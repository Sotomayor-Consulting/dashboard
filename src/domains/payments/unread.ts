import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.payments.unread');

export interface PagoPorLeer {
	id: string;
	status: string;
	seen_by_ops: boolean;
	created_at: string;
	monto: number;
	moneda: string;
	order_id: string;
	usuarios?: {
		user_id: string;
		nombre: string;
		apellido: string;
	};
}

// Shape aplanado que consume la UI (billing/PagosRealizadosTable).
export interface RawPaymentItem {
	payment_id: string;
	order_id: string;
	provider_transaction_id: string | null;
	amount: number | null; // en dólares
	status: string | null;
	seen_by_ops: boolean;
	created_at: string | null;
	usuarios?: {
		nombre?: string | null;
		apellido?: string | null;
		correo?: string | null;
	};
	incorporations?: {
		id?: string | null;
		principal_name?: string | null;
		state?: string | null;
	};
	servicios?: {
		nombre?: string | null;
		categoria?: string | null;
	};
}

// Solo embeds INTRA-schema orders (PostgREST no resuelve cross-schema desde
// el profile `orders`). Nombres de plan/servicio ya vienen denormalizados en
// order_lines; usuarios/incorporations se resuelven aparte (ver enrich*).
const PAYMENT_SELECT = `
	id, provider_transaction_id, amount, status, created_at,
	order:order_id!inner (
		id, order_number, seen_by_ops, currency, user_id, incorporation_id,
		order_lines ( service_plan_id, service_plan_name )
	)
` as const;

type OrderEmbed = {
	id: string;
	order_number: string;
	seen_by_ops: boolean;
	currency: string;
	user_id: string;
	incorporation_id: string | null;
	order_lines?: Array<{
		service_plan_id: number | null;
		service_plan_name: string | null;
	}>;
};

type PaymentEmbed = {
	id: string;
	provider_transaction_id: string | null;
	amount: number | null;
	status: string | null;
	created_at: string | null;
	order: OrderEmbed | null;
};

type UsuarioRow = {
	user_id: string;
	nombre: string | null;
	apellido: string | null;
	correo: string | null;
};
type IncorporationRow = {
	id: string;
	principal_name: string | null;
	state: string | null;
};

// La línea "plan" de la orden es la que tiene service_plan_id.
function planLineOf(order: OrderEmbed | null) {
	return order?.order_lines?.find((l) => l.service_plan_id != null) ?? null;
}

// Resuelve usuarios/incorporations por id (queries separadas en public).
async function fetchLookups(
	supabase: SupabaseClient,
	userIds: string[],
	incIds: string[],
) {
	const usuarios = new Map<string, UsuarioRow>();
	const incorporations = new Map<string, IncorporationRow>();

	const [{ data: uRows }, { data: iRows }] = await Promise.all([
		userIds.length
			? supabase
					.from('usuarios')
					.select('user_id, nombre, apellido, correo')
					.in('user_id', userIds)
			: Promise.resolve({ data: [] as UsuarioRow[] }),
		incIds.length
			? supabase
					.from('incorporations')
					.select('id, principal_name, state')
					.in('id', incIds)
			: Promise.resolve({ data: [] as IncorporationRow[] }),
	]);

	for (const u of (uRows ?? []) as UsuarioRow[]) usuarios.set(u.user_id, u);
	for (const i of (iRows ?? []) as IncorporationRow[])
		incorporations.set(i.id, i);

	return { usuarios, incorporations };
}

function toRawPaymentItem(
	p: PaymentEmbed,
	lookups: {
		usuarios: Map<string, UsuarioRow>;
		incorporations: Map<string, IncorporationRow>;
	},
): RawPaymentItem {
	const order = p.order;
	const plan = planLineOf(order);
	const usuario = order?.user_id ? lookups.usuarios.get(order.user_id) : null;
	const inc = order?.incorporation_id
		? lookups.incorporations.get(order.incorporation_id)
		: null;

	const item: RawPaymentItem = {
		payment_id: p.id,
		order_id: order?.id ?? '',
		provider_transaction_id: p.provider_transaction_id,
		amount: p.amount,
		status: p.status,
		seen_by_ops: order?.seen_by_ops === true,
		created_at: p.created_at,
		servicios: { nombre: plan?.service_plan_name ?? null, categoria: null },
	};
	if (usuario) {
		item.usuarios = {
			nombre: usuario.nombre,
			apellido: usuario.apellido,
			correo: usuario.correo,
		};
	}
	if (inc) {
		item.incorporations = {
			id: inc.id,
			principal_name: inc.principal_name,
			state: inc.state,
		};
	}
	return item;
}

async function mapPaymentsWithLookups(
	supabase: SupabaseClient,
	rows: PaymentEmbed[],
): Promise<RawPaymentItem[]> {
	const userIds = [
		...new Set(rows.map((r) => r.order?.user_id).filter(Boolean) as string[]),
	];
	const incIds = [
		...new Set(
			rows.map((r) => r.order?.incorporation_id).filter(Boolean) as string[],
		),
	];
	const lookups = await fetchLookups(supabase, userIds, incIds);
	return rows.map((r) => toRawPaymentItem(r, lookups));
}

export async function getPagosPorLeer(
	supabase: SupabaseClient,
	userRole?: string,
): Promise<{ count: number; data: PagoPorLeer[] }> {
	if (userRole !== 'admin') return { count: 0, data: [] };

	const { data, error } = await supabase
		.schema('orders')
		.from('payments')
		.select(
			`id, amount, status, created_at,
			 order:order_id!inner ( id, seen_by_ops, currency, user_id )`,
		)
		.eq('status', 'succeeded')
		.eq('order.seen_by_ops', false)
		.order('created_at', { ascending: true });

	if (error) {
		log.error('Error fetching pagos por leer', { error });
		return { count: 0, data: [] };
	}

	const rows = (data ?? []) as unknown as Array<{
		id: string;
		amount: number | null;
		status: string | null;
		created_at: string | null;
		order: {
			id: string;
			seen_by_ops: boolean;
			currency: string;
			user_id: string;
		} | null;
	}>;

	const userIds = [
		...new Set(rows.map((r) => r.order?.user_id).filter(Boolean) as string[]),
	];
	const { usuarios } = await fetchLookups(supabase, userIds, []);

	const mapped: PagoPorLeer[] = rows.map((r) => {
		const row: PagoPorLeer = {
			id: r.id,
			status: r.status ?? 'unknown',
			seen_by_ops: r.order?.seen_by_ops === true,
			created_at: r.created_at ?? '',
			monto: r.amount ?? 0,
			moneda: r.order?.currency ?? 'usd',
			order_id: r.order?.id ?? '',
		};
		const u = r.order?.user_id ? usuarios.get(r.order.user_id) : null;
		if (u) {
			row.usuarios = {
				user_id: u.user_id,
				nombre: u.nombre ?? '',
				apellido: u.apellido ?? '',
			};
		}
		return row;
	});

	return { count: mapped.length, data: mapped };
}

export const pagosRealizadosData = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.schema('orders')
		.from('payments')
		.select(PAYMENT_SELECT)
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching all payments data', { error });
		throw error;
	}

	return mapPaymentsWithLookups(supabase, (data ?? []) as unknown as PaymentEmbed[]);
};

export const pagosRealizadosPorSubir = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.schema('orders')
		.from('payments')
		.select(PAYMENT_SELECT)
		.eq('status', 'succeeded')
		.order('created_at', { ascending: false });

	if (error) {
		log.error('Error fetching succeeded payments data', { error });
		throw error;
	}

	return mapPaymentsWithLookups(supabase, (data ?? []) as unknown as PaymentEmbed[]);
};

export const pagosRealizadosPorSubirById = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data, error } = await supabase
		.schema('orders')
		.from('payments')
		.select(PAYMENT_SELECT)
		.eq('status', 'succeeded')
		.eq('order.incorporation_id', empresaId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		log.error('Error fetching payment by incorporation', { error });
		throw error;
	}

	if (!data) return null;
	const [item] = await mapPaymentsWithLookups(supabase, [
		data as unknown as PaymentEmbed,
	]);
	return item ?? null;
};

export const pagosPorSubirById = pagosRealizadosPorSubirById;
