import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin } from '@infrastructure/supabase/admin';

export const prerender = false;

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET =
	process.env.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Códigos Postgres "permanentes": no tiene sentido reintentar.
// P0001 = raise exception genérico que usamos para validaciones de negocio.
// P0002 = no_data_found (PaymentIntent aún no replicado por el FDW puede pasar,
//          pero si tras varios minutos sigue faltando, es permanente).
const PERMANENT_PG_CODES = new Set(['P0001']);

async function registrarPago(paymentIntentId: string) {
	const { data, error } = await supabaseAdmin.rpc(
		'registrar_pago_desde_stripe',
		{ p_payment_intent_id: paymentIntentId },
	);
	return { data, error };
}

export const POST: APIRoute = async ({ request }) => {
	if (!stripe || !STRIPE_WEBHOOK_SECRET) {
		console.error('[webhook] Falta STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET');
		return new Response('Server misconfigured', { status: 500 });
	}

	const sig = request.headers.get('stripe-signature');
	if (!sig) return new Response('Missing signature', { status: 400 });

	const rawBody = await request.text();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
	} catch (err: any) {
		console.error('[webhook] Firma inválida:', err?.message);
		return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
	}

	try {
		let paymentIntentId: string | undefined;

		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.payment_status !== 'paid') {
					console.log(`[webhook] session ${session.id} no pagada (${session.payment_status}), skip`);
					break;
				}
				paymentIntentId =
					typeof session.payment_intent === 'string'
						? session.payment_intent
						: session.payment_intent?.id;
				break;
			}

			case 'payment_intent.succeeded': {
				const pi = event.data.object as Stripe.PaymentIntent;
				paymentIntentId = pi.id;
				break;
			}

			case 'invoice.paid':
			case 'invoice_payment.paid': {
				const inv = event.data.object as Stripe.Invoice;
				paymentIntentId =
					typeof (inv as any).payment_intent === 'string'
						? (inv as any).payment_intent
						: (inv as any).payment_intent?.id;
				if (!paymentIntentId) {
					console.log(`[webhook] ${event.type} sin payment_intent (invoice ${inv.id}), skip`);
				}
				break;
			}

			case 'checkout.session.expired':
				console.log('[webhook] sesión expirada:', (event.data.object as any).id);
				break;

			default:
				break;
		}

		if (paymentIntentId) {
			const { data, error } = await registrarPago(paymentIntentId);
			if (error) {
				const code = (error as any).code as string | undefined;
				const isPermanent = code && PERMANENT_PG_CODES.has(code);
				console.error(
					`[webhook] RPC error (${isPermanent ? 'permanente' : 'transitorio'}):`,
					error,
				);
				if (!isPermanent) {
					// Solo pedir reintento a Stripe si parece transitorio (timeout, red, etc.)
					return new Response(`RPC error: ${error.message}`, { status: 500 });
				}
				// Permanente: ack 200 para no entrar en loop de reintentos
			} else {
				console.log('[webhook] pago registrado:', data);
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: any) {
		console.error('[webhook] handler error:', err);
		return new Response('Internal error', { status: 500 });
	}
};
