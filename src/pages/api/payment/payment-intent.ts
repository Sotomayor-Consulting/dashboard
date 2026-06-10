// ─── Crear PaymentIntent en Stripe ──────────────────────
// Requiere autenticación. Valida que el userId del body
// coincida con el usuario autenticado (previene suplantación).
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('payment-intent');

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
	log.error('Missing STRIPE_SECRET_KEY environment variable.');
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!stripe) {
		return new Response(
			JSON.stringify({ error: 'Configuracion incompleta de pagos (Stripe).' }),
			{
				status: 503,
				headers: SECURITY_HEADERS,
			},
		);
	}

	// ─── 1) Autenticación (server-verified via getUser) ──
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
		// ─── 2) Parsear body (una sola vez — el stream es de lectura única) ──
		const body = (await request.json().catch(() => null)) as {
			planId?: string;
			userId?: string;
			empresaId?: string;
			microservicios?: Array<{ id: string; name: string; price: number }>;
		} | null;

		if (!body || !body.planId || !body.userId || !body.empresaId) {
			return new Response(
				JSON.stringify({ error: 'Missing planId, userId or empresaId' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// ─── 3) Validar que el userId del body sea el usuario autenticado ──
		if (body.userId !== user.id) {
			return new Response(
				JSON.stringify({ error: 'No autorizado para este usuario' }),
				{
					status: 403,
					headers: SECURITY_HEADERS,
				},
			);
		}

		const { planId, userId, empresaId, microservicios = [] } = body;

		// ─── 4) Servicio vigente (precio/activo) ─────────
		const { data: servicio, error: serviciosErr } = await supabaseAdmin
			.from('servicios')
			.select('id_servicios, nombre, precio, servicio_activo')
			.eq('id_servicios', planId)
			.eq('servicio_activo', true)
			.single();

		if (serviciosErr || !servicio) {
			log.error('Servicio no encontrado o inactivo', { error: serviciosErr });
			return new Response(
				JSON.stringify({ error: 'Servicio no encontrado o inactivo' }),
				{
					status: 404,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// ─── 5) Validar y obtener precios de microservicios desde la BD ──
		let microserviciosTotal = 0;
		let microserviciosValidados: Array<{
			id: string;
			name: string;
			price: number;
		}> = [];

		if (microservicios.length > 0) {
			const microserviciosIds = microservicios.map((m) => m.id);
			const { data: microserviciosDB, error: microserviciosErr } =
				await supabaseAdmin
					.from('micro_servicios')
					.select('id_micro_servicios, nombre, precio, estado')
					.in('id_micro_servicios', microserviciosIds)
					.eq('estado', true);

			if (microserviciosErr) {
				log.error('Error obteniendo microservicios', {
						error: microserviciosErr,
					});
				return new Response(
					JSON.stringify({ error: 'Error validando microservicios' }),
					{
						status: 400,
						headers: SECURITY_HEADERS,
					},
				);
			}

			for (const solicitado of microservicios) {
				const dbItem = microserviciosDB?.find(
					(db) => db.id_micro_servicios === solicitado.id,
				);
				if (!dbItem) {
					return new Response(
						JSON.stringify({
							error: `Microservicio ${solicitado.id} no encontrado o inactivo`,
						}),
						{
							status: 400,
							headers: SECURITY_HEADERS,
						},
					);
				}

				// Usar el precio de la BD (seguro) en lugar del del frontend
				microserviciosValidados.push({
					id: dbItem.id_micro_servicios,
					name: dbItem.nombre,
					price: Number(dbItem.precio),
				});
				microserviciosTotal += Number(dbItem.precio);
			}
		}

		// ─── 6) Montos (USD → centavos) + 4.5% fee ──────
		const planBaseAmount = Number(servicio.precio) + microserviciosTotal;
		const baseAmountCents = Math.round(planBaseAmount * 100);
		const feePercent = 0.045;
		const totalAmountCents = Math.round(baseAmountCents * (1 + feePercent));

		if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
			log.error('Monto inválido para servicio', { servicio });
			return new Response(
				JSON.stringify({ error: 'Monto inválido para el servicio' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// ─── 7) Metadata para Stripe ─────────────────────
		const metadata: Record<string, string> = {
			servicio_id: String(servicio.id_servicios),
			user_id: String(userId),
			empresa_incorporacion_id: String(empresaId),
			base_amount_cents: String(baseAmountCents),
			fee_percent: String(feePercent * 100), // "4.5"
			plan_base_amount: String(servicio.precio),
			microservicios_total: String(microserviciosTotal),
			microservicios_count: String(microserviciosValidados.length),
		};

		if (microserviciosValidados.length > 0) {
			metadata.microservicios_exist = 'true';

			const microserviciosArray = microserviciosValidados.map((m) => ({
				id: m.id,
				name: m.name,
				price: m.price,
			}));

			metadata.microservicios_array = JSON.stringify(microserviciosArray);

			// Compatibilidad legacy (datos separados por comas)
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

		// ─── 8) Crear PaymentIntent en Stripe ────────────
		let description = servicio.nombre ?? 'Servicio LLC';
		if (microserviciosValidados.length > 0) {
			const microserviciosNames = microserviciosValidados
				.map((m) => m.name)
				.join(', ');
			description += ` + ${microserviciosNames}`;
		}

		const paymentIntent = await stripe.paymentIntents.create({
			amount: totalAmountCents,
			currency: 'usd',
			description,
			metadata,
			payment_method_types: ['card'],
		});

		// ─── 9) Respuesta ────────────────────────────────
		return new Response(
			JSON.stringify({ clientSecret: paymentIntent.client_secret }),
			{
				status: 200,
				headers: SECURITY_HEADERS,
			},
		);
	} catch (err: any) {
		log.error('Error en create-payment-intent', { err });
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: SECURITY_HEADERS,
		});
	}
};
