// ─── Crear Checkout Session en Stripe ────────────────────
// Requiere autenticación. Valida servicio + microservicios contra la BD,
// calcula el fee del 4.5% y devuelve la URL hosted de Stripe Checkout.
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

const log = createLogger('checkout-session');

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

const PUBLIC_SITE_URL =
	process.env.PUBLIC_SITE_URL ??
	import.meta.env.PUBLIC_SITE_URL ??
	(import.meta.env.DEV ? 'http://localhost:4321' : '');

const MISSING_SITE_URL =
	!PUBLIC_SITE_URL || PUBLIC_SITE_URL.includes('localhost');

if (!STRIPE_SECRET_KEY) {
	log.error('Missing STRIPE_SECRET_KEY environment variable.');
}
if (import.meta.env.PROD && MISSING_SITE_URL) {
	log.error(
		'PUBLIC_SITE_URL no configurada en producción: los success_url de Stripe apuntarían a localhost.',
	);
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!stripe || (import.meta.env.PROD && MISSING_SITE_URL)) {
		return new Response(
			JSON.stringify({ error: 'Configuracion incompleta de pagos.' }),
			{ status: 503, headers: SECURITY_HEADERS },
		);
	}

	// 1) Auth
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
		// 2) Body
		const body = (await request.json().catch(() => null)) as {
			planId?: string;
			userId?: string;
			empresaId?: string;
			microservicios?: Array<{ id: string; name: string; price: number }>;
		} | null;

		if (!body || !body.planId || !body.userId || !body.empresaId) {
			return new Response(
				JSON.stringify({ error: 'Missing planId, userId or empresaId' }),
				{ status: 400, headers: SECURITY_HEADERS },
			);
		}

		if (body.userId !== user.id) {
			return new Response(
				JSON.stringify({ error: 'No autorizado para este usuario' }),
				{ status: 403, headers: SECURITY_HEADERS },
			);
		}

		const { planId, userId, empresaId, microservicios = [] } = body;

		// 3) Plan vigente (catálogo canónico; planId = catalogs.service_plans.id)
		const planIdNum = Number(planId);
		if (!Number.isInteger(planIdNum) || planIdNum <= 0) {
			return new Response(JSON.stringify({ error: 'planId inválido' }), {
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
				JSON.stringify({ error: 'Servicio no encontrado o inactivo' }),
				{ status: 404, headers: SECURITY_HEADERS },
			);
		}

		// Servicio "ancla" del plan (order_lines.service_id es NOT NULL). Fallback 7.
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
				?.catalogs_services?.name ?? (plan.name ?? 'Servicio LLC');

		// 4) Validar addons contra el catálogo canónico (precios desde BD, no del cliente).
		//    id = public.services.id (int canónico).
		let microserviciosTotal = 0;
		const microserviciosValidados: Array<{
			id: string;
			name: string;
			price: number;
		}> = [];
		const addonServiceIds: number[] = [];

		if (microservicios.length > 0) {
			const ids = microservicios.map((m) => Number(m.id));
			if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
				return new Response(
					JSON.stringify({ error: 'Microservicio con id inválido' }),
					{ status: 400, headers: SECURITY_HEADERS },
				);
			}
			const { data: microsDB, error: microsErr } = await supabaseAdmin
				.schema('catalogs')
				.from('services')
				.select('id, name, price')
				.in('id', ids)
				.eq('is_active', true)
				.eq('sellable_alone', true);

			if (microsErr) {
				return new Response(
					JSON.stringify({ error: 'Error validando microservicios' }),
					{ status: 400, headers: SECURITY_HEADERS },
				);
			}

			for (const sol of microservicios) {
				const dbItem = microsDB?.find((db) => db.id === Number(sol.id));
				if (!dbItem) {
					return new Response(
						JSON.stringify({
							error: `Microservicio ${sol.id} no encontrado o inactivo`,
						}),
						{ status: 400, headers: SECURITY_HEADERS },
					);
				}
				microserviciosValidados.push({
					id: String(dbItem.id),
					name: dbItem.name,
					price: Number(dbItem.price),
				});
				addonServiceIds.push(dbItem.id);
				microserviciosTotal += Number(dbItem.price);
			}
		}

		// 5) Montos
		const planBaseAmount = Number(plan.price) + microserviciosTotal;
		const baseAmountCents = Math.round(planBaseAmount * 100);
		const feePercent = PROCESSING_FEE_PERCENT;
		const feeCents = computeFeeCents(baseAmountCents);

		if (!Number.isFinite(baseAmountCents) || baseAmountCents <= 0) {
			return new Response(
				JSON.stringify({ error: 'Monto inválido para el servicio' }),
				{ status: 400, headers: SECURITY_HEADERS },
			);
		}

		// 5b) Orden (nace en pending_payment; el webhook la confirma vía RPC).
		//     Si ya existe una orden pendiente para esta empresa/usuario se
		//     reutiliza (reemplazando líneas) — evita órdenes duplicadas cuando
		//     el usuario cancela el checkout y reintenta el pago.
		//     Si falla no bloqueamos el cobro: la orden es capa de tracking.
		const pendingOrder = await getOrCreatePendingOrder(supabaseAdmin, {
			userId,
			incorporationId: empresaId,
			flow: 'incorporation',
			metadata: {
				plan_slug: plan.slug,
				fee_cents: feeCents,
				fee_percent: feePercent * 100,
			},
			lines: [
				{
					service_id: anchorServiceId,
					service_plan_id: plan.id,
					service_name: anchorServiceName,
					service_plan_name: plan.name,
					unit_price: Number(plan.price),
					quantity: 1,
				},
				...microserviciosValidados.map((m) => ({
					service_id: Number(m.id),
					service_plan_id: null,
					service_name: m.name,
					service_plan_name: null,
					unit_price: m.price,
					quantity: 1,
				})),
			],
		});
		const orderId = pendingOrder?.orderId ?? null;

		// Expirar la Checkout Session anterior (si sigue abierta) para que solo
		// exista un checkout activo por orden.
		if (pendingOrder?.previousStripeSessionId) {
			try {
				await stripe.checkout.sessions.expire(
					pendingOrder.previousStripeSessionId,
				);
			} catch {
				// Ya expirada/completada — nada que hacer.
			}
		}

		// 6) line_items: plan + microservicios + fee desglosado
		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
			{
				price_data: {
					currency: 'usd',
					product_data: { name: plan.name ?? 'Servicio LLC' },
					unit_amount: Math.round(Number(plan.price) * 100),
				},
				quantity: 1,
			},
			...microserviciosValidados.map((m) => ({
				price_data: {
					currency: 'usd' as const,
					product_data: { name: m.name },
					unit_amount: Math.round(m.price * 100),
				},
				quantity: 1,
			})),
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name: 'Servicios financieros',
						description: `Procesamiento de pagos`,
					},
					unit_amount: feeCents,
				},
				quantity: 1,
			},
		];

		// 7) Metadata (registrar_pago_desde_stripe resuelve el pago por plan_id)
		const metadata: Record<string, string> = {
			plan_id: String(plan.id), // id canónico (catalogs.service_plans)
			...(orderId ? { order_id: orderId } : {}),
			plan_slug: String(plan.slug),
			user_id: String(userId),
			empresa_incorporacion_id: String(empresaId),
			base_amount_cents: String(baseAmountCents),
			fee_percent: String(feePercent * 100),
			plan_base_amount: String(plan.price),
			microservicios_total: String(microserviciosTotal),
			microservicios_count: String(microserviciosValidados.length),
		};

		if (microserviciosValidados.length > 0) {
			metadata.microservicios_exist = 'true';
			metadata.addon_service_ids = addonServiceIds.join(','); // ids canónicos (services)
			metadata.microservicios_array = JSON.stringify(
				microserviciosValidados.map((m) => ({
					id: m.id,
					name: m.name,
					price: m.price,
				})),
			);
		} else {
			metadata.microservicios_exist = 'false';
			metadata.microservicios_array = '[]';
		}

		// Al cancelar, el usuario vuelve a la página desde la que inició el
		// checkout (Referer validado same-origin para evitar open redirects).
		let cancelUrl = `${PUBLIC_SITE_URL}/incorporation-and-payment`;
		const referer = request.headers.get('referer');
		if (referer) {
			try {
				const refererUrl = new URL(referer);
				if (refererUrl.origin === new URL(PUBLIC_SITE_URL).origin) {
					cancelUrl = refererUrl.href;
				}
			} catch {
				// Referer malformado: se mantiene el fallback
			}
		}

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
					message:
						'Iniciaremos tu proceso de incorporación al confirmar el pago.',
				},
			},
			invoice_creation: { enabled: true, invoice_data: { metadata } },
			payment_intent_data: {
				metadata,
				description:
					microserviciosValidados.length > 0
						? `${plan.name} + ${microserviciosValidados
								.map((m) => m.name)
								.join(', ')}`
						: (plan.name ?? 'Servicio LLC'),
			},
			success_url: `${PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: cancelUrl,
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
