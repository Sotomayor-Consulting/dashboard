// ─── Órdenes pendientes de checkout ──────────────────────
// Evita órdenes duplicadas cuando el usuario cancela el checkout de Stripe
// y vuelve a intentar el pago: reutiliza la orden `pending_payment` existente
// para la misma empresa/usuario/flujo, actualizando sus líneas (el carrito
// puede haber cambiado) en lugar de insertar una orden nueva por intento.
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('checkout-orders');

export type CheckoutFlow = 'incorporation' | 'upgrade';

// Fee de procesamiento — única fuente de verdad para todos los endpoints
// de pago (misma fórmula siempre: fee como line item separado del base).
export const PROCESSING_FEE_PERCENT = 0.045;

export function computeFeeCents(baseAmountCents: number): number {
	return Math.round(baseAmountCents * PROCESSING_FEE_PERCENT);
}

export interface OrderLineInput {
	service_id: number;
	service_plan_id: number | null;
	service_name: string;
	service_plan_name: string | null;
	unit_price: number;
	quantity: number;
}

export interface PendingOrderResult {
	orderId: string;
	/** Checkout Session de Stripe previa asociada a la orden (para expirarla). */
	previousStripeSessionId: string | null;
	reused: boolean;
}

/**
 * Busca una orden `pending_payment` reutilizable para el mismo
 * usuario + incorporación + flujo. Si existe, actualiza su metadata y
 * reemplaza sus líneas; si no, crea una orden nueva con sus líneas.
 * Devuelve `null` si no se pudo ni reutilizar ni crear (el checkout
 * continúa sin order_id — la orden es capa de tracking).
 */
export async function getOrCreatePendingOrder(
	supabaseAdmin: SupabaseClient,
	params: {
		userId: string;
		incorporationId: string;
		flow: CheckoutFlow;
		metadata: Record<string, unknown>;
		lines: OrderLineInput[];
	},
): Promise<PendingOrderResult | null> {
	const { userId, incorporationId, flow, metadata, lines } = params;

	// 1) Buscar orden pendiente existente del mismo flujo.
	const { data: existing, error: findErr } = await supabaseAdmin
		.schema('orders')
		.from('orders')
		.select('id, metadata')
		.eq('user_id', userId)
		.eq('incorporation_id', incorporationId)
		.eq('status', 'pending_payment')
		.order('created_at', { ascending: false })
		.limit(10);

	if (findErr) {
		log.error('Error buscando órdenes pendientes', { error: findErr, userId });
	}

	const sameFlow = (existing ?? []).find((o) => {
		const meta = (o.metadata ?? {}) as Record<string, unknown>;
		const orderFlow = meta['payment_flow'] === 'upgrade' ? 'upgrade' : 'incorporation';
		return orderFlow === flow;
	});

	if (sameFlow) {
		const orderId = sameFlow.id as string;
		const prevMeta = (sameFlow.metadata ?? {}) as Record<string, unknown>;
		const previousStripeSessionId =
			typeof prevMeta['stripe_session_id'] === 'string'
				? (prevMeta['stripe_session_id'] as string)
				: null;

		const { error: updErr } = await supabaseAdmin
			.schema('orders')
			.from('orders')
			.update({ metadata: { ...prevMeta, ...metadata } })
			.eq('id', orderId);
		if (updErr) {
			log.error('No se pudo actualizar metadata de orden reutilizada', {
				error: updErr,
				orderId,
			});
		}

		// Reemplazar líneas: el carrito pudo cambiar entre intentos.
		const { error: delErr } = await supabaseAdmin
			.schema('orders')
			.from('order_lines')
			.delete()
			.eq('order_id', orderId);
		if (delErr) {
			log.error('No se pudieron limpiar order_lines de orden reutilizada', {
				error: delErr,
				orderId,
			});
		} else {
			const { error: linesErr } = await supabaseAdmin
				.schema('orders')
				.from('order_lines')
				.insert(lines.map((l) => ({ ...l, order_id: orderId })));
			if (linesErr) {
				log.error('No se pudieron recrear order_lines', {
					error: linesErr,
					orderId,
				});
			}
		}

		log.info('Orden pendiente reutilizada para nuevo intento de pago', {
			orderId,
			userId,
			flow,
		});
		return { orderId, previousStripeSessionId, reused: true };
	}

	// 2) No hay orden reutilizable: crear una nueva.
	const { data: order, error: orderErr } = await supabaseAdmin
		.schema('orders')
		.from('orders')
		.insert({
			user_id: userId,
			incorporation_id: incorporationId,
			status: 'pending_payment',
			currency: 'usd',
			metadata,
		})
		.select('id')
		.single();

	if (orderErr || !order) {
		log.error('No se pudo crear la orden (se continúa sin order_id)', {
			error: orderErr,
			userId,
			flow,
		});
		return null;
	}

	const orderId = order.id as string;
	const { error: linesErr } = await supabaseAdmin
		.schema('orders')
		.from('order_lines')
		.insert(lines.map((l) => ({ ...l, order_id: orderId })));
	if (linesErr) {
		log.error('No se pudieron crear las order_lines', {
			error: linesErr,
			orderId,
		});
	}

	return { orderId, previousStripeSessionId: null, reused: false };
}

/**
 * Guarda el id de la Checkout Session de Stripe en la metadata de la orden,
 * para poder expirarla si el usuario reintenta el pago más tarde.
 */
export async function attachStripeSessionToOrder(
	supabaseAdmin: SupabaseClient,
	orderId: string,
	stripeSessionId: string,
): Promise<void> {
	const { data: current } = await supabaseAdmin
		.schema('orders')
		.from('orders')
		.select('metadata')
		.eq('id', orderId)
		.single();

	const meta = ((current?.metadata ?? {}) as Record<string, unknown>) || {};
	const { error } = await supabaseAdmin
		.schema('orders')
		.from('orders')
		.update({ metadata: { ...meta, stripe_session_id: stripeSessionId } })
		.eq('id', orderId);
	if (error) {
		log.error('No se pudo guardar stripe_session_id en la orden', {
			error,
			orderId,
		});
	}
}
