// ─── Reanudar el pago de una orden pendiente ─────────────
// Patrón recomendado por Stripe: si la Checkout Session previa sigue
// `open`, se redirige a su misma URL; si expiró (24h) o no existe, se
// crea una sesión nueva reconstruida desde las order_lines de la orden.
// La orden NO se duplica: se reutiliza el mismo order_id en la metadata.
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import {
	PROCESSING_FEE_PERCENT,
	attachStripeSessionToOrder,
	computeFeeCents,
} from '@domains/payments/checkout-orders';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import {
	checkRateLimit,
	rateLimitResponse,
} from '@infrastructure/security/rate-limit';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('resume-checkout');

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

const PUBLIC_SITE_URL =
	process.env.PUBLIC_SITE_URL ??
	import.meta.env.PUBLIC_SITE_URL ??
	'http://localhost:4321';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

if (import.meta.env.PROD && PUBLIC_SITE_URL.includes('localhost')) {
	log.error(
		'PUBLIC_SITE_URL no configurada en producción: los success_url de Stripe apuntarán a localhost.',
	);
}

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!stripe) {
		return new Response(
			JSON.stringify({ error: 'Configuracion incompleta de pagos (Stripe).' }),
			{ status: 503, headers: SECURITY_HEADERS },
		);
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	if (!checkRateLimit(`checkout:${user.id}`)) {
		return rateLimitResponse(SECURITY_HEADERS);
	}

	try {
		const body = (await request.json().catch(() => null)) as {
			orderId?: string;
		} | null;
		if (!body?.orderId) {
			return new Response(JSON.stringify({ error: 'Missing orderId' }), {
				status: 400,
				headers: SECURITY_HEADERS,
			});
		}

		// 1) Orden: debe ser del usuario y estar pendiente de pago.
		const { data: order, error: orderErr } = await supabaseAdmin
			.schema('orders')
			.from('orders')
			.select('id, user_id, incorporation_id, status, metadata')
			.eq('id', body.orderId)
			.single();

		if (orderErr || !order) {
			return new Response(JSON.stringify({ error: 'Orden no encontrada' }), {
				status: 404,
				headers: SECURITY_HEADERS,
			});
		}
		if (order.user_id !== user.id) {
			return new Response(
				JSON.stringify({ error: 'No autorizado para esta orden' }),
				{ status: 403, headers: SECURITY_HEADERS },
			);
		}
		if (order.status !== 'pending_payment') {
			return new Response(
				JSON.stringify({ error: 'La orden ya no está pendiente de pago' }),
				{ status: 409, headers: SECURITY_HEADERS },
			);
		}

		const meta = (order.metadata ?? {}) as Record<string, unknown>;

		// 2) Si la sesión previa sigue abierta, reusar su URL (Stripe docs:
		//    una sesión `open` conserva su url y puede retomarse).
		const prevSessionId =
			typeof meta['stripe_session_id'] === 'string'
				? (meta['stripe_session_id'] as string)
				: null;
		if (prevSessionId) {
			try {
				const prev = await stripe.checkout.sessions.retrieve(prevSessionId);
				if (prev.status === 'open' && prev.url) {
					return new Response(
						JSON.stringify({ url: prev.url, id: prev.id, resumed: true }),
						{ status: 200, headers: SECURITY_HEADERS },
					);
				}
			} catch (err) {
				log.warn('No se pudo recuperar la sesión previa; se creará una nueva', {
					orderId: order.id,
					prevSessionId,
				});
			}
		}

		// 3) Sesión expirada o inexistente: reconstruir desde las order_lines.
		const { data: lines, error: linesErr } = await supabaseAdmin
			.schema('orders')
			.from('order_lines')
			.select(
				'service_id, service_plan_id, service_name, service_plan_name, unit_price, quantity',
			)
			.eq('order_id', order.id);

		if (linesErr || !lines || lines.length === 0) {
			return new Response(
				JSON.stringify({ error: 'La orden no tiene líneas para cobrar' }),
				{ status: 422, headers: SECURITY_HEADERS },
			);
		}

		const baseAmountCents = lines.reduce(
			(sum, l) =>
				sum + Math.round(Number(l.unit_price) * 100) * (l.quantity ?? 1),
			0,
		);
		if (baseAmountCents <= 0) {
			return new Response(
				JSON.stringify({ error: 'Monto inválido para la orden' }),
				{ status: 422, headers: SECURITY_HEADERS },
			);
		}
		const feeCents = computeFeeCents(baseAmountCents);

		const planLine = lines.find((l) => l.service_plan_id != null);
		const isUpgrade = meta['payment_flow'] === 'upgrade';

		const metadata: Record<string, string> = {
			order_id: order.id,
			user_id: user.id,
			empresa_incorporacion_id: String(order.incorporation_id ?? ''),
			base_amount_cents: String(baseAmountCents),
			fee_percent: String(PROCESSING_FEE_PERCENT * 100),
			...(planLine?.service_plan_id
				? { plan_id: String(planLine.service_plan_id) }
				: {}),
			...(typeof meta['plan_slug'] === 'string'
				? { plan_slug: meta['plan_slug'] as string }
				: {}),
			...(isUpgrade ? { payment_flow: 'upgrade' } : {}),
			resumed_checkout: 'true',
		};

		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
			...lines.map((l) => ({
				price_data: {
					currency: 'usd' as const,
					product_data: {
						name: l.service_plan_name ?? l.service_name ?? 'Servicio LLC',
					},
					unit_amount: Math.round(Number(l.unit_price) * 100),
				},
				quantity: l.quantity ?? 1,
			})),
			{
				price_data: {
					currency: 'usd' as const,
					product_data: {
						name: 'Servicios financieros',
						description: 'Procesamiento de pagos',
					},
					unit_amount: feeCents,
				},
				quantity: 1,
			},
		];

		// Sin payment_method_types: Stripe muestra dinámicamente los métodos
		// óptimos (configurables desde el Dashboard, sin cambios de código).
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			line_items: lineItems,
			client_reference_id: user.id,
			metadata,
			allow_promotion_codes: true,
			custom_text: {
				submit: {
					message: isUpgrade
						? 'Iniciaremos el upgrade de tu LLC al confirmar el pago.'
						: 'Iniciaremos tu proceso de incorporación al confirmar el pago.',
				},
			},
			invoice_creation: { enabled: true, invoice_data: { metadata } },
			payment_intent_data: { metadata },
			success_url: `${PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${PUBLIC_SITE_URL}/orders/`,
			...(user.email ? { customer_email: user.email } : {}),
		});

		if (!session.url) {
			return new Response(
				JSON.stringify({ error: 'No se pudo crear la sesión de pago' }),
				{ status: 500, headers: SECURITY_HEADERS },
			);
		}

		await attachStripeSessionToOrder(supabaseAdmin, order.id, session.id);

		return new Response(
			JSON.stringify({ url: session.url, id: session.id, resumed: false }),
			{ status: 200, headers: SECURITY_HEADERS },
		);
	} catch (err: any) {
		log.error('error', { err });
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: SECURITY_HEADERS,
		});
	}
};
