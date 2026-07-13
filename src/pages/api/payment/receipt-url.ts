// ─── URLs de recibo y factura de una orden pagada ────────
// Recibe orderId, verifica que la orden pertenezca al usuario autenticado
// y devuelve las URLs guardadas por el webhook en payments.provider_metadata
// (receipt_url, hosted_invoice_url, invoice_pdf). Si no están guardadas
// (pagos previos al cambio), hace fallback a Stripe en vivo y las persiste.
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('receipt-url');

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const POST: APIRoute = async ({ request, cookies }) => {
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

	const body = (await request.json().catch(() => null)) as {
		orderId?: string;
	} | null;
	if (!body?.orderId) {
		return new Response(JSON.stringify({ error: 'Missing orderId' }), {
			status: 400,
			headers: SECURITY_HEADERS,
		});
	}

	try {
		// 1) La orden debe pertenecer al usuario autenticado.
		const { data: order } = await supabaseAdmin
			.schema('orders')
			.from('orders')
			.select('id, user_id')
			.eq('id', body.orderId)
			.single();
		if (!order || order.user_id !== user.id) {
			return new Response(JSON.stringify({ error: 'Orden no encontrada' }), {
				status: 404,
				headers: SECURITY_HEADERS,
			});
		}

		// 2) Pago exitoso más reciente de la orden.
		const { data: payment } = await supabaseAdmin
			.schema('orders')
			.from('payments')
			.select('id, provider_transaction_id, provider_metadata')
			.eq('order_id', order.id)
			.eq('status', 'succeeded')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (!payment) {
			return new Response(
				JSON.stringify({ error: 'La orden no tiene un pago registrado' }),
				{ status: 404, headers: SECURITY_HEADERS },
			);
		}

		const meta =
			((payment.provider_metadata ?? {}) as Record<string, unknown>) || {};
		let receiptUrl =
			typeof meta['receipt_url'] === 'string'
				? (meta['receipt_url'] as string)
				: null;
		let invoiceUrl =
			typeof meta['hosted_invoice_url'] === 'string'
				? (meta['hosted_invoice_url'] as string)
				: null;
		let invoicePdf =
			typeof meta['invoice_pdf'] === 'string'
				? (meta['invoice_pdf'] as string)
				: null;

		// 3) Fallback: pagos registrados antes de guardar URLs en metadata.
		if (!receiptUrl && stripe && payment.provider_transaction_id) {
			try {
				const pi = await stripe.paymentIntents.retrieve(
					payment.provider_transaction_id,
					{ expand: ['latest_charge'] },
				);
				const charge = pi.latest_charge as Stripe.Charge | null;
				receiptUrl = charge?.receipt_url ?? null;
				if (receiptUrl) {
					await supabaseAdmin
						.schema('orders')
						.from('payments')
						.update({
							provider_metadata: { ...meta, receipt_url: receiptUrl },
						})
						.eq('id', payment.id);
				}
			} catch {
				log.warn('fallback a Stripe falló', {
					paymentIntentId: payment.provider_transaction_id,
				});
			}
		}

		if (!receiptUrl && !invoiceUrl && !invoicePdf) {
			return new Response(
				JSON.stringify({ error: 'Recibo no disponible aún' }),
				{ status: 404, headers: SECURITY_HEADERS },
			);
		}

		return new Response(
			JSON.stringify({ receiptUrl, invoiceUrl, invoicePdf }),
			{ status: 200, headers: SECURITY_HEADERS },
		);
	} catch (err) {
		log.error('error', { err });
		return new Response(
			JSON.stringify({ error: 'No se pudo obtener el recibo' }),
			{ status: 500, headers: SECURITY_HEADERS },
		);
	}
};
