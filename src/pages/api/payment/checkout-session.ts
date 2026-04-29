// src/pages/api/payment/checkout-session.ts
// ─── Crear Checkout Session en Stripe ────────────────────
// Requiere autenticación. Valida servicio + microservicios contra la BD,
// calcula el fee del 4.5% y devuelve la URL hosted de Stripe Checkout.
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

if (!STRIPE_SECRET_KEY) {
	console.error(
		'[checkout-session] Missing STRIPE_SECRET_KEY environment variable.',
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

		// 3) Servicio vigente
		const { data: servicio, error: servicioErr } = await supabaseAdmin
			.from('servicios')
			.select('id_servicios, nombre, precio, servicio_activo')
			.eq('id_servicios', planId)
			.eq('servicio_activo', true)
			.single();

		if (servicioErr || !servicio) {
			return new Response(
				JSON.stringify({ error: 'Servicio no encontrado o inactivo' }),
				{ status: 404, headers: SECURITY_HEADERS },
			);
		}

		// 4) Validar microservicios contra la BD (precios desde BD, no del cliente)
		let microserviciosTotal = 0;
		const microserviciosValidados: Array<{
			id: string;
			name: string;
			price: number;
		}> = [];

		if (microservicios.length > 0) {
			const ids = microservicios.map((m) => m.id);
			const { data: microsDB, error: microsErr } = await supabaseAdmin
				.from('micro_servicios')
				.select('id_micro_servicios, nombre, precio, estado')
				.in('id_micro_servicios', ids)
				.eq('estado', true);

			if (microsErr) {
				return new Response(
					JSON.stringify({ error: 'Error validando microservicios' }),
					{ status: 400, headers: SECURITY_HEADERS },
				);
			}

			for (const sol of microservicios) {
				const dbItem = microsDB?.find(
					(db) => db.id_micro_servicios === sol.id,
				);
				if (!dbItem) {
					return new Response(
						JSON.stringify({
							error: `Microservicio ${sol.id} no encontrado o inactivo`,
						}),
						{ status: 400, headers: SECURITY_HEADERS },
					);
				}
				microserviciosValidados.push({
					id: dbItem.id_micro_servicios,
					name: dbItem.nombre,
					price: Number(dbItem.precio),
				});
				microserviciosTotal += Number(dbItem.precio);
			}
		}

		// 5) Montos
		const planBaseAmount = Number(servicio.precio) + microserviciosTotal;
		const baseAmountCents = Math.round(planBaseAmount * 100);
		const feePercent = 0.045;
		const feeCents = Math.round(baseAmountCents * feePercent);

		if (!Number.isFinite(baseAmountCents) || baseAmountCents <= 0) {
			return new Response(
				JSON.stringify({ error: 'Monto inválido para el servicio' }),
				{ status: 400, headers: SECURITY_HEADERS },
			);
		}

		// 6) line_items: plan + microservicios + fee desglosado
		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
			{
				price_data: {
					currency: 'usd',
					product_data: { name: servicio.nombre ?? 'Servicio LLC' },
					unit_amount: Math.round(Number(servicio.precio) * 100),
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

		// 7) Metadata (compatible con tu RPC actual via el PaymentIntent generado)
		const metadata: Record<string, string> = {
			servicio_id: String(servicio.id_servicios),
			user_id: String(userId),
			empresa_incorporacion_id: String(empresaId),
			base_amount_cents: String(baseAmountCents),
			fee_percent: String(feePercent * 100),
			plan_base_amount: String(servicio.precio),
			microservicios_total: String(microserviciosTotal),
			microservicios_count: String(microserviciosValidados.length),
		};

		if (microserviciosValidados.length > 0) {
			metadata.microservicios_exist = 'true';
			metadata.microservicios_array = JSON.stringify(
				microserviciosValidados.map((m) => ({
					id: m.id,
					name: m.name,
					price: m.price,
				})),
			);
			metadata.microservicios_ids = microserviciosValidados
				.map((m) => m.id)
				.join(',');
			metadata.microservicios_names = microserviciosValidados
				.map((m) => m.name)
				.join(',');
			metadata.microservicios_prices = microserviciosValidados
				.map((m) => m.price)
				.join(',');
		} else {
			metadata.microservicios_exist = 'false';
			metadata.microservicios_array = '[]';
		}

		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			payment_method_types: ['card', 'us_bank_account', 'amazon_pay', 'cashapp'],
			line_items: lineItems,
			client_reference_id: user.id,
			metadata,
			allow_promotion_codes: true,
			custom_text: {
				submit: { message: 'Iniciaremos tu proceso de incorporación al confirmar el pago.' },
			},
			invoice_creation: { enabled: true, invoice_data: { metadata } },
			payment_intent_data: {
				metadata,
				description:
					microserviciosValidados.length > 0
						? `${servicio.nombre} + ${microserviciosValidados
							.map((m) => m.name)
							.join(', ')}`
						: (servicio.nombre ?? 'Servicio LLC'),
			},
			success_url: `${PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${PUBLIC_SITE_URL}/payment/cancel`,
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
		console.error('[checkout-session] error:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: SECURITY_HEADERS,
		});
	}
};
