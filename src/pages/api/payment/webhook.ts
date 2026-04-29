// src/pages/api/payment/webhook.ts
// ─── Webhook de Stripe Checkout ──────────────────────────
// Recibe checkout.session.completed y registra el pago via RPC existente.
// IMPORTANTE: este endpoint es público (no usa auth de Supabase). La firma
// del header stripe-signature es la única validación.
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin } from '@lib/supabase/admin';

export const prerender = false;

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET =
	process.env.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

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
		event = stripe.webhooks.constructEvent(
			rawBody,
			sig,
			STRIPE_WEBHOOK_SECRET,
		);
	} catch (err: any) {
		console.error('[webhook] Firma inválida:', err?.message);
		return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;

				if (session.payment_status !== 'paid') {
					console.log(
						`[webhook] session ${session.id} no pagada (status=${session.payment_status}), skip`,
					);
					break;
				}

				const paymentIntentId =
					typeof session.payment_intent === 'string'
						? session.payment_intent
						: session.payment_intent?.id;

				if (!paymentIntentId) {
					console.error('[webhook] sin payment_intent en la sesión:', session.id);
					return new Response('Missing payment_intent', { status: 400 });
				}

				const { data, error } = await supabaseAdmin.rpc(
					'registrar_pago_desde_stripe',
					{ p_payment_intent_id: paymentIntentId },
				);

				if (error) {
					console.error('[webhook] RPC error:', error);
					// Devuelve 500 para que Stripe reintente
					return new Response(`RPC error: ${error.message}`, { status: 500 });
				}

				console.log('[webhook] pago registrado:', data);
				break;
			}

			case 'checkout.session.expired':
				console.log('[webhook] sesión expirada:', (event.data.object as any).id);
				break;

			default:
				// Ignorar otros eventos
				break;
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
