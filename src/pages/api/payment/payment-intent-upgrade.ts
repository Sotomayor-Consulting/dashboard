import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';
import { SECURITY_HEADERS } from '@lib/security/headers';

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;
const PROCESSING_FEE_PERCENT = 0.045;

if (!STRIPE_SECRET_KEY) {
	console.error(
		'[payment-intent-upgrade] Missing STRIPE_SECRET_KEY environment variable.',
	);
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
			servicio?: {
				id?: string;
				price?: number;
			};
		} | null;

		if (!body?.userId || !body?.empresaId || !body?.servicio?.id) {
			return new Response(
				JSON.stringify({ error: 'Missing userId, empresaId or servicio' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		if (body.userId !== user.id) {
			return new Response(
				JSON.stringify({ error: 'No autorizado para este usuario' }),
				{
					status: 403,
					headers: SECURITY_HEADERS,
				},
			);
		}

		const { data: servicio, error: servicioError } = await supabaseAdmin
			.from('servicios')
			.select('id_servicios, nombre, precio, servicio_activo')
			.eq('id_servicios', body.servicio.id)
			.eq('servicio_activo', true)
			.single();

		if (servicioError || !servicio) {
			console.error(
				'[payment-intent-upgrade] servicio no encontrado o inactivo:',
				servicioError,
			);
			return new Response(
				JSON.stringify({ error: 'Servicio de upgrade no encontrado o inactivo' }),
				{
					status: 404,
					headers: SECURITY_HEADERS,
				},
			);
		}

		const upgradeBaseAmount = Number(servicio.precio);
		if (!Number.isFinite(upgradeBaseAmount) || upgradeBaseAmount <= 0) {
			return new Response(JSON.stringify({ error: 'Monto invalido para upgrade' }), {
				status: 400,
				headers: SECURITY_HEADERS,
			});
		}

		const frontendPrice = Number(body.servicio.price);
		if (
			Number.isFinite(frontendPrice) &&
			frontendPrice > 0 &&
			frontendPrice !== upgradeBaseAmount
		) {
			console.warn('[payment-intent-upgrade] frontend/base mismatch', {
				frontendPrice,
				databasePrice: upgradeBaseAmount,
				serviceId: body.servicio.id,
			});
		}

		const baseAmountCents = Math.round(upgradeBaseAmount * 100);
		const feeAmountCents = Math.round(baseAmountCents * PROCESSING_FEE_PERCENT);
		const totalAmountCents = baseAmountCents + feeAmountCents;

		const paymentIntent = await stripe.paymentIntents.create({
			amount: totalAmountCents,
			currency: 'usd',
			description: servicio.nombre || 'Pago por Upgrade LLC - Final',
			payment_method_types: ['card'],
			metadata: {
				servicio_id: String(servicio.id_servicios),
				user_id: String(body.userId),
				empresa_incorporacion_id: String(body.empresaId),
				base_amount_cents: String(baseAmountCents),
				fee_amount_cents: String(feeAmountCents),
				fee_percent: String(PROCESSING_FEE_PERCENT * 100),
				plan_base_amount: String(upgradeBaseAmount),
				payment_flow: 'upgrade',
			},
		});

		return new Response(
			JSON.stringify({
				clientSecret: paymentIntent.client_secret,
				amounts: {
					base: upgradeBaseAmount,
					fee: feeAmountCents / 100,
					total: totalAmountCents / 100,
				},
			}),
			{
				status: 200,
				headers: SECURITY_HEADERS,
			},
		);
	} catch (error) {
		console.error('[payment-intent-upgrade] error:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: SECURITY_HEADERS,
		});
	}
};
