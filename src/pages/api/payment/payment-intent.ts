import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe backend
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string);

// Supabase backend (SERVICE ROLE en backend; ANON como fallback)
const supabase = createClient(
	import.meta.env.PUBLIC_SUPABASE_URL as string,
	(import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
		(import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string),
);

export const POST: APIRoute = async ({ request }) => {
	try {
		// 1) Body: requerimos empresaId y microservicios
		const body = (await request.json().catch(() => null)) as {
			planId?: string;
			userId?: string; // UUID del usuario
			empresaId?: string; // UUID de empresas_incorporaciones.empresa_incorporacion_id
			microservicios?: Array<{ id: string; name: string; price: number }>;
		} | null;

		if (!body || !body.planId || !body.userId || !body.empresaId) {
			return new Response(
				JSON.stringify({ error: 'Missing planId, userId or empresaId' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const { planId, userId, empresaId, microservicios = [] } = body;

		// 2) Servicio vigente (precio/activo)
		const { data: servicio, error: serviciosErr } = await supabase
			.from('servicios')
			.select('id_servicios, nombre, precio, servicio_activo')
			.eq('id_servicios', planId)
			.eq('servicio_activo', true)
			.single();

		if (serviciosErr || !servicio) {
			console.error('Servicio no encontrado o inactivo:', serviciosErr);
			return new Response(
				JSON.stringify({ error: 'Servicio no encontrado o inactivo' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// 3) Validar y obtener precios de microservicios desde la base de datos
		let microserviciosTotal = 0;
		let microserviciosValidados: Array<{ id: string; name: string; price: number }> = [];

		if (microservicios.length > 0) {
			// Obtener los microservicios desde la base de datos para validar precios
			const microserviciosIds = microservicios.map(m => m.id);
			const { data: microserviciosDB, error: microserviciosErr } = await supabase
				.from('micro_servicios')
				.select('id_micro_servicios, nombre, precio, estado')
				.in('id_micro_servicios', microserviciosIds)
				.eq('estado', true);

			if (microserviciosErr) {
				console.error('Error obteniendo microservicios:', microserviciosErr);
				return new Response(
					JSON.stringify({ error: 'Error validando microservicios' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			// Validar que todos los microservicios solicitados existan y estén activos
			for (const solicitado of microservicios) {
				const dbItem = microserviciosDB?.find(db => db.id_micro_servicios === solicitado.id);
				if (!dbItem) {
					return new Response(
						JSON.stringify({ error: `Microservicio ${solicitado.id} no encontrado o inactivo` }),
						{
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						},
					);
				}
				
				// Usar el precio de la base de datos (seguro) en lugar del del frontend
				microserviciosValidados.push({
					id: dbItem.id_micro_servicios,
					name: dbItem.nombre,
					price: Number(dbItem.precio)
				});
				microserviciosTotal += Number(dbItem.precio);
			}
		}

		// 4) Montos (USD→centavos) + 4.5% fee
		const planBaseAmount = Number(servicio.precio) + microserviciosTotal;
		const baseAmountCents = Math.round(planBaseAmount * 100);
		const feePercent = 0.045;
		const totalAmountCents = Math.round(baseAmountCents * (1 + feePercent));

		if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
			console.error('Monto inválido para servicio:', servicio);
			return new Response(
				JSON.stringify({ error: 'Monto inválido para el servicio' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// 5) Metadata para Stripe (estructura optimizada para trigger)
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

		// Estructura optimizada para trigger de Supabase
		if (microserviciosValidados.length > 0) {
			// Booleano para verificación rápida en trigger
			metadata.microservicios_exist = 'true';
			
			// Array JSON bien estructurado para copia directa
			const microserviciosArray = microserviciosValidados.map(m => ({
				id: m.id,
				name: m.name,
				price: m.price
			}));
			
			// Guardar como string JSON en metadata (Stripe solo acepta strings)
			metadata.microservicios_array = JSON.stringify(microserviciosArray);
			
			// Mantener compatibilidad con datos separados por comas (legacy)
			metadata.microservicios_ids = microserviciosValidados.map(m => m.id).join(',');
			metadata.microservicios_names = microserviciosValidados.map(m => m.name).join(',');
			metadata.microservicios_prices = microserviciosValidados.map(m => m.price).join(',');
		} else {
			// Booleano para indicar que no hay microservicios
			metadata.microservicios_exist = 'false';
			metadata.microservicios_array = '[]';
		}

		// 6) PaymentIntent en Stripe
		let description = servicio.nombre ?? 'Servicio LLC';
		if (microserviciosValidados.length > 0) {
			const microserviciosNames = microserviciosValidados.map(m => m.name).join(', ');
			description += ` + ${microserviciosNames}`;
		}

		const paymentIntent = await stripe.paymentIntents.create(
			{
				amount: totalAmountCents,
				currency: 'usd',
				description,
				metadata,
				payment_method_types: ['card'],
			},
			// , { idempotencyKey: `pi:${userId}:${planId}:${empresaId}:${totalAmountCents}` } // opcional
		);

		// 6) Respuesta
		return new Response(
			JSON.stringify({ clientSecret: paymentIntent.client_secret }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (err: any) {
		console.error('Error en create-payment-intent:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
