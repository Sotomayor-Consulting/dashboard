import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe backend
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string);

// Supabase backend (service role)
const supabase = createClient(
	import.meta.env.SUPABASE_URL as string,
	import.meta.env.SUPABASE_ANON_KEY as string,
);

export const POST: APIRoute = async ({ request }) => {
	try {
		// 1) Leer el body
		const body = (await request.json().catch(() => null)) as {
			planId?: string;
		} | null;

		if (!body || !body.planId) {
			return new Response(JSON.stringify({ error: 'Missing planId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { planId } = body; // este es tu id_servicios (uuid)

		// 2) Buscar el servicio en la tabla "servicios"
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
				{ status: 404, headers: { 'Content-Type': 'application/json' } },
			);
		}

		// 2) Convertir precio (USD) a centavos
		const baseAmountCents = Math.round(servicio.precio * 100);

		// 4% de recargo
		const feePercent = 0.045;
		const totalAmountCents = Math.round(baseAmountCents * (1 + feePercent));

		if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
			console.error('Monto inválido para servicio:', servicio);
			return new Response(
				JSON.stringify({ error: 'Monto inválido para el servicio' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		// 3) Crear PaymentIntent en Stripe
		const paymentIntent = await stripe.paymentIntents.create({
			amount: totalAmountCents,
			currency: 'usd',
			description: servicio.nombre ?? 'Servicio LLC',
			metadata: {
				servicio_id: servicio.id_servicios,
				base_amount_cents: baseAmountCents.toString(),
				fee_percent: (feePercent * 100).toString(), // "4"
			},
			payment_method_types: ['card'],
		});

		// 5) Devolver el clientSecret al front
		return new Response(
			JSON.stringify({ clientSecret: paymentIntent.client_secret }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		);
	} catch (err: any) {
		console.error('Error en create-payment-intent:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
