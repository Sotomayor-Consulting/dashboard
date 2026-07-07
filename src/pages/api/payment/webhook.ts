import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { sendPaymentSucceededEmailByPaymentIntent } from '@infrastructure/email/bussiness-events';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('webhook');

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
		log.error('Falta STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET');
		return new Response('Server misconfigured', { status: 500 });
	}

	const sig = request.headers.get('stripe-signature');
	if (!sig) return new Response('Missing signature', { status: 400 });

	const rawBody = await request.text();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
	} catch (err: any) {
		log.error('Firma inválida', { message: err?.message });
		return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
	}

	try {
		let paymentIntentId: string | undefined;

		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.payment_status !== 'paid') {
					log.info('session no pagada, skip', {
							sessionId: session.id,
							paymentStatus: session.payment_status,
						});
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

			case 'invoice.paid': {
				const inv = event.data.object as Stripe.Invoice;
				let firstPayment = inv.payments?.data?.[0];
				if (!firstPayment) {
					const expanded = await stripe.invoices.retrieve(inv.id, {
						expand: ['payments.data.payment.payment_intent'],
					});
					firstPayment = expanded.payments?.data?.[0];
				}
				paymentIntentId =
					typeof firstPayment?.payment?.payment_intent === 'string'
						? firstPayment.payment.payment_intent
						: (firstPayment?.payment?.payment_intent as any)?.id;
				if (!paymentIntentId) {
					log.info('evento sin payment_intent, skip', {
						eventType: event.type,
						invoiceId: inv.id,
					});
				}
				break;
			}

			case 'checkout.session.expired':
				log.info('sesión expirada', {
						sessionId: (event.data.object as any).id,
					});
				break;

			default:
				break;
		}

		if (paymentIntentId) {
			const { data, error } = await registrarPago(paymentIntentId);
			if (error) {
				const code = (error as any).code as string | undefined;
				const isPermanent = code && PERMANENT_PG_CODES.has(code);
				log.error('RPC error', {
						kind: isPermanent ? 'permanente' : 'transitorio',
						code,
						error,
					});
				if (!isPermanent) {
					// Solo pedir reintento a Stripe si parece transitorio (timeout, red, etc.)
					return new Response(`RPC error: ${error.message}`, { status: 500 });
				}
				// Permanente: ack 200 para no entrar en loop de reintentos
			} else {
				log.info('pago registrado', { data });
				await sendPaymentSucceededEmailByPaymentIntent(paymentIntentId).catch(
					(emailError: unknown) => {
						log.error('payment email failed', {
							paymentIntentId,
							error:
								emailError instanceof Error
									? emailError.message
									: String(emailError),
						});
					},
				);
			}
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: any) {
		log.error('handler error', { err });
		return new Response('Internal error', { status: 500 });
	}
};
