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
const PERMANENT_PG_CODES = new Set(['P0001']);

// El schema `stripe` (FDW) ya no existe: el RPC recibe el PaymentIntent
// completo como jsonb, recuperado aquí de la API de Stripe (fuente de verdad).
async function registrarPago(paymentIntentId: string) {
	if (!stripe) {
		return {
			data: null,
			error: { message: 'Stripe no configurado' } as {
				message: string;
				code?: string;
			},
		};
	}
	const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
	const { data, error } = await supabaseAdmin.rpc(
		'registrar_pago_desde_stripe',
		{ p_payment_intent: pi as unknown as Record<string, unknown> },
	);
	return { data, error };
}

// Guarda las URLs de recibo (charge.receipt_url) y factura
// (hosted_invoice_url / invoice_pdf) en payments.provider_metadata para que
// el cliente pueda descargarlas desde su historial de órdenes. Best-effort:
// un fallo aquí no afecta el registro del pago.
async function savePaymentUrls(
	paymentId: string,
	paymentIntentId: string,
	invoiceId: string | null,
) {
	if (!stripe) return;
	const urls: Record<string, string> = {};

	try {
		const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
			expand: ['latest_charge'],
		});
		const charge = pi.latest_charge as Stripe.Charge | null;
		if (charge?.receipt_url) urls.receipt_url = charge.receipt_url;
	} catch (err) {
		log.warn('no se pudo obtener receipt_url', { paymentIntentId });
	}

	if (invoiceId) {
		try {
			const inv = await stripe.invoices.retrieve(invoiceId);
			if (inv.hosted_invoice_url) urls.hosted_invoice_url = inv.hosted_invoice_url;
			if (inv.invoice_pdf) urls.invoice_pdf = inv.invoice_pdf;
		} catch (err) {
			log.warn('no se pudo obtener la factura', { invoiceId });
		}
	}

	if (Object.keys(urls).length === 0) return;

	const { data: current } = await supabaseAdmin
		.schema('orders')
		.from('payments')
		.select('provider_metadata')
		.eq('id', paymentId)
		.single();
	const meta =
		((current?.provider_metadata ?? {}) as Record<string, unknown>) || {};
	const { error } = await supabaseAdmin
		.schema('orders')
		.from('payments')
		.update({ provider_metadata: { ...meta, ...urls } })
		.eq('id', paymentId);
	if (error) {
		log.error('no se pudieron guardar las URLs de recibo/factura', {
			error,
			paymentId,
		});
	} else {
		log.info('URLs de recibo/factura guardadas', {
			paymentId,
			keys: Object.keys(urls),
		});
	}
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
		// Mensaje genérico: no dar feedback a requests falsificados.
		return new Response('Invalid signature', { status: 400 });
	}

	// Guard de entorno: eventos de test no deben procesarse con una key live
	// (ni al revés) — señal de webhook mal configurado en el Dashboard.
	const isLiveKey =
		STRIPE_SECRET_KEY.startsWith('sk_live') ||
		STRIPE_SECRET_KEY.startsWith('rk_live');
	if (event.livemode !== isLiveKey) {
		log.warn('livemode del evento no coincide con el entorno, skip', {
			eventId: event.id,
			eventLivemode: event.livemode,
			keyLive: isLiveKey,
		});
		return new Response(JSON.stringify({ received: true, skipped: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Idempotencia a nivel de evento: si Stripe reenvía un evento ya
	// procesado con éxito (retry por timeout), lo saltamos. El RPC además
	// es idempotente por provider_transaction_id como segunda defensa.
	const { data: alreadyProcessed } = await supabaseAdmin
		.schema('orders')
		.from('payment_events')
		.select('id')
		.eq('provider_event_id', event.id)
		.maybeSingle();
	if (alreadyProcessed) {
		log.info('evento duplicado, skip', { eventId: event.id, type: event.type });
		return new Response(JSON.stringify({ received: true, duplicate: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		let paymentIntentId: string | undefined;
		let invoiceId: string | null = null;

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
				invoiceId =
					typeof session.invoice === 'string'
						? session.invoice
						: (session.invoice?.id ?? null);
				break;
			}

			case 'payment_intent.succeeded': {
				const pi = event.data.object as Stripe.PaymentIntent;
				paymentIntentId = pi.id;
				break;
			}

			case 'invoice.paid': {
				const inv = event.data.object as Stripe.Invoice;
				invoiceId = inv.id ?? null;
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

			case 'checkout.session.async_payment_succeeded': {
				// ACH y otros métodos de notificación diferida: el pago se
				// confirmó días después del checkout. Procesar igual que un
				// checkout pagado (el RPC es idempotente por provider_transaction_id).
				const session = event.data.object as Stripe.Checkout.Session;
				paymentIntentId =
					typeof session.payment_intent === 'string'
						? session.payment_intent
						: session.payment_intent?.id;
				invoiceId =
					typeof session.invoice === 'string'
						? session.invoice
						: (session.invoice?.id ?? null);
				break;
			}

			case 'checkout.session.async_payment_failed': {
				// ACH rechazado (fondos insuficientes, cuenta cerrada, etc.).
				// Revertir la orden a pending_payment para que el usuario pueda
				// reintentar con otro método de pago.
				const session = event.data.object as Stripe.Checkout.Session;
				const orderId = session.metadata?.order_id;
				if (orderId) {
					const { stripe_session_id: _drop, ...rest } =
						((
							await supabaseAdmin
								.schema('orders')
								.from('orders')
								.select('metadata')
								.eq('id', orderId)
								.maybeSingle()
						).data?.metadata ?? {}) as Record<string, unknown>;
					await supabaseAdmin
						.schema('orders')
						.from('orders')
						.update({
							status: 'pending_payment',
							metadata: {
								...rest,
								async_payment_failed_at: new Date().toISOString(),
								async_payment_failed_event: event.id,
							},
						})
						.eq('id', orderId);
					log.warn('pago asíncrono fallido (ACH/delayed)', {
						orderId,
						sessionId: session.id,
					});
				} else {
					log.warn('async_payment_failed sin order_id', {
						sessionId: session.id,
					});
				}
				break;
			}

			case 'checkout.session.expired': {
				// Carrito abandonado (docs.stripe.com/payments/checkout/abandoned-carts):
				// limpiar la referencia a la sesión muerta en la orden pendiente para
				// que "Continuar pago" reconstruya una sesión fresca directamente.
				const session = event.data.object as Stripe.Checkout.Session;
				const orderId = session.metadata?.order_id;
				if (orderId) {
					const { data: ord } = await supabaseAdmin
						.schema('orders')
						.from('orders')
						.select('id, status, metadata')
						.eq('id', orderId)
						.maybeSingle();
					const ordMeta = (ord?.metadata ?? {}) as Record<string, unknown>;
					// Solo si la sesión expirada sigue siendo la vigente de la orden
					// (si el usuario ya reintentó, hay una sesión más nueva adjunta).
					if (
						ord?.status === 'pending_payment' &&
						ordMeta['stripe_session_id'] === session.id
					) {
						const { stripe_session_id: _drop, ...rest } = ordMeta;
						await supabaseAdmin
							.schema('orders')
							.from('orders')
							.update({
								metadata: {
									...rest,
									last_session_expired_at: new Date().toISOString(),
								},
							})
							.eq('id', orderId);
						log.info('sesión expirada desvinculada de la orden', {
							sessionId: session.id,
							orderId,
						});
					}
				} else {
					log.info('sesión expirada (sin order_id)', { sessionId: session.id });
				}
				break;
			}

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
					return new Response('Processing error', { status: 500 });
				}
				// Permanente: ack 200 para no entrar en loop de reintentos
			} else {
				log.info('pago registrado', { data });
				// Auditoría inmutable del evento (idempotente por provider_event_id).
				const paymentId = (data as { id?: string } | null)?.id;
				if (paymentId) {
					await savePaymentUrls(paymentId, paymentIntentId, invoiceId).catch(
						(err: unknown) => {
							log.error('savePaymentUrls failed', {
								paymentId,
								error: err instanceof Error ? err.message : String(err),
							});
						},
					);
					const { error: evtError } = await supabaseAdmin
						.schema('orders')
						.from('payment_events')
						.upsert(
							{
								payment_id: paymentId,
								provider_event_id: event.id,
								event_type: event.type,
								processing_status: 'processed',
								processed_at: new Date().toISOString(),
								payload: event as unknown as Record<string, unknown>,
							},
							{ onConflict: 'provider_event_id', ignoreDuplicates: true },
						);
					if (evtError) {
						log.error('no se pudo registrar payment_event', {
							error: evtError,
							eventId: event.id,
						});
					}
				}
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
