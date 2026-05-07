// src/pages/api/payment/checkout-session-upgrade.ts
// ─── Stripe Checkout Session: Upgrade LLC ────────────────
// Crea una sesión hosted de Stripe Checkout para el upgrade de una
// empresa existente. Equivalente a checkout-session.ts pero con un solo
// servicio (el de upgrade) y metadata payment_flow='upgrade'.
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';
import { SECURITY_HEADERS } from '@lib/security/headers';

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

const PUBLIC_SITE_URL =
	process.env.PUBLIC_SITE_URL ??
	import.meta.env.PUBLIC_SITE_URL ??
	'http://localhost:4321';

const PROCESSING_FEE_PERCENT = 0.045;

if (!STRIPE_SECRET_KEY) {
	console.error(
		'[checkout-session-upgrade] Missing STRIPE_SECRET_KEY environment variable.',
	);
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

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

	try {
		const body = (await request.json().catch(() => null)) as {
			userId?: string;
			empresaId?: string;
			servicio?: { id?: string | number };
		} | null;

		if (!body?.userId || !body?.empresaId || !body?.servicio?.id) {
			return new Response(
				JSON.stringify({ error: 'Missing userId, empresaId or servicio' }),
				{ status: 400, headers: SECURITY_HEADERS },
			);
		}

		if (body.userId !== user.id) {
			return new Response(
				JSON.stringify({ error: 'No autorizado para este usuario' }),
				{ status: 403, headers: SECURITY_HEADERS },
			);
		}

		const { data: servicio, error: servicioErr } = await supabaseAdmin
			.from('servicios')
			.select('id_servicios, nombre, precio, servicio_activo')
			.eq('id_servicios', body.servicio.id)
			.eq('servicio_activo', true)
			.single();

		if (servicioErr || !servicio) {
			return new Response(
				JSON.stringify({ error: 'Servicio de upgrade no encontrado o inactivo' }),
				{ status: 404, headers: SECURITY_HEADERS },
			);
		}

		const baseAmount = Number(servicio.precio);
		if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
			return new Response(
				JSON.stringify({ error: 'Monto inválido para upgrade' }),
				{ status: 400, headers: SECURITY_HEADERS },
			);
		}

		const baseAmountCents = Math.round(baseAmount * 100);
		const feeCents = Math.round(baseAmountCents * PROCESSING_FEE_PERCENT);

		const metadata: Record<string, string> = {
			servicio_id: String(servicio.id_servicios),
			user_id: String(body.userId),
			empresa_incorporacion_id: String(body.empresaId),
			base_amount_cents: String(baseAmountCents),
			fee_amount_cents: String(feeCents),
			fee_percent: String(PROCESSING_FEE_PERCENT * 100),
			plan_base_amount: String(baseAmount),
			payment_flow: 'upgrade',
		};

		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name: servicio.nombre ?? 'Upgrade LLC',
					},
					unit_amount: baseAmountCents,
				},
				quantity: 1,
			},
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name: 'Servicios financieros',
						description: 'Procesamiento de pagos',
					},
					unit_amount: feeCents,
				},
				quantity: 1,
			},
		];

		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			payment_method_types: ['card', 'us_bank_account', 'amazon_pay', 'cashapp'],
			line_items: lineItems,
			client_reference_id: user.id,
			metadata,
			allow_promotion_codes: true,
			custom_text: {
				submit: {
					message: 'Iniciaremos el upgrade de tu LLC al confirmar el pago.',
				},
			},
			invoice_creation: { enabled: true, invoice_data: { metadata } },
			payment_intent_data: {
				metadata,
				description: servicio.nombre || 'Upgrade LLC',
			},
			success_url: `${PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${PUBLIC_SITE_URL}/upgrade`,
			...(user.email ? { customer_email: user.email } : {}),
		});

		if (!session.url) {
			return new Response(
				JSON.stringify({ error: 'No se pudo crear la sesión de pago' }),
				{ status: 500, headers: SECURITY_HEADERS },
			);
		}

		return new Response(JSON.stringify({ url: session.url, id: session.id }), {
			status: 200,
			headers: SECURITY_HEADERS,
		});
	} catch (err: any) {
		console.error('[checkout-session-upgrade] error:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: SECURITY_HEADERS,
		});
	}
};
