// ─── Stripe Checkout Session: Upgrade LLC ────────────────
// Crea una sesión hosted de Stripe Checkout para el upgrade de una
// empresa existente. Equivalente a checkout-session.ts pero con un solo
// servicio (el de upgrade) y metadata payment_flow='upgrade'.
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import {
	PROCESSING_FEE_PERCENT,
	attachStripeSessionToOrder,
	computeFeeCents,
	getOrCreatePendingOrder,
} from '@domains/payments/checkout-orders';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import {
	checkRateLimit,
	rateLimitResponse,
} from '@infrastructure/security/rate-limit';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('checkout-session-upgrade');

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

const PUBLIC_SITE_URL =
	process.env.PUBLIC_SITE_URL ??
	import.meta.env.PUBLIC_SITE_URL ??
	'http://localhost:4321';

if (!STRIPE_SECRET_KEY) {
	log.error('Missing STRIPE_SECRET_KEY environment variable.');
}
if (import.meta.env.PROD && PUBLIC_SITE_URL.includes('localhost')) {
	log.error(
		'PUBLIC_SITE_URL no configurada en producción: los success_url de Stripe apuntarán a localhost.',
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

	if (!checkRateLimit(`checkout:${user.id}`)) {
		return rateLimitResponse(SECURITY_HEADERS);
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

		const planIdNum = Number(body.servicio.id);
		if (!Number.isInteger(planIdNum) || planIdNum <= 0) {
			return new Response(JSON.stringify({ error: 'servicio.id inválido' }), {
				status: 400,
				headers: SECURITY_HEADERS,
			});
		}
		const { data: plan, error: planCatErr } = await supabaseAdmin
			.schema('catalogs')
			.from('service_plans')
			.select('id, slug, name, price')
			.eq('id', planIdNum)
			.eq('is_active', true)
			.single();

		if (planCatErr || !plan) {
			return new Response(
				JSON.stringify({
					error: 'Servicio de upgrade no encontrado o inactivo',
				}),
				{ status: 404, headers: SECURITY_HEADERS },
			);
		}

		const baseAmount = Number(plan.price);
		if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
			return new Response(
				JSON.stringify({ error: 'Monto inválido para upgrade' }),
				{ status: 400, headers: SECURITY_HEADERS },
			);
		}

		const baseAmountCents = Math.round(baseAmount * 100);
		const feeCents = computeFeeCents(baseAmountCents);

		// Orden de upgrade (pending_payment; el webhook la confirma vía RPC).
		const { data: anchorLine } = await supabaseAdmin
			.schema('catalogs')
			.from('service_plan_lines')
			.select('service_id, catalogs_services:service_id (name)')
			.eq('service_plan_id', plan.id)
			.order('service_id', { ascending: true })
			.limit(1)
			.maybeSingle();
		const anchorServiceId = (anchorLine?.service_id as number | undefined) ?? 7;
		const anchorServiceName =
			(anchorLine as { catalogs_services?: { name?: string } } | null)
				?.catalogs_services?.name ?? (plan.name ?? 'Upgrade LLC');

		// Reutiliza la orden pendiente de upgrade si existe (evita duplicados
		// cuando el usuario cancela el checkout y reintenta el pago).
		const pendingOrder = await getOrCreatePendingOrder(supabaseAdmin, {
			userId: body.userId,
			incorporationId: body.empresaId,
			flow: 'upgrade',
			metadata: {
				plan_slug: plan.slug,
				payment_flow: 'upgrade',
				fee_cents: feeCents,
			},
			lines: [
				{
					service_id: anchorServiceId,
					service_plan_id: plan.id,
					service_name: anchorServiceName,
					service_plan_name: plan.name,
					unit_price: baseAmount,
					quantity: 1,
				},
			],
		});
		const orderId = pendingOrder?.orderId ?? null;

		if (pendingOrder?.previousStripeSessionId) {
			try {
				await stripe.checkout.sessions.expire(
					pendingOrder.previousStripeSessionId,
				);
			} catch {
				// Ya expirada/completada — nada que hacer.
			}
		}

		const metadata: Record<string, string> = {
			plan_id: String(plan.id), // id canónico (catalogs.service_plans)
			...(orderId ? { order_id: orderId } : {}),
			plan_slug: String(plan.slug),
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
						name: plan.name ?? 'Upgrade LLC',
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
					message: 'Iniciaremos el upgrade de tu LLC al confirmar el pago.',
				},
			},
			invoice_creation: { enabled: true, invoice_data: { metadata } },
			payment_intent_data: {
				metadata,
				description: plan.name || 'Upgrade LLC',
			},
			success_url: `${PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${PUBLIC_SITE_URL}/upgrade`,
			...(user.email ? { customer_email: user.email } : {}),
		});

		if (orderId) {
			await attachStripeSessionToOrder(supabaseAdmin, orderId, session.id);
		}

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
		log.error('error', { err });
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: SECURITY_HEADERS,
		});
	}
};
