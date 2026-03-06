// /api/payment/register
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
	try {
		const { paymentIntentId } = (await request.json()) as {
			paymentIntentId?: string;
		};
		if (!paymentIntentId)
			return new Response(
				JSON.stringify({ error: 'paymentIntentId is required' }),
				{ status: 400 },
			);

		const { data, error } = await supabaseAdmin.rpc(
			'registrar_pago_desde_stripe',
			{ p_payment_intent_id: paymentIntentId },
		);

		if (error) {
			return new Response(
				JSON.stringify({
					error: error.message,
					code: (error as any).code ?? null,
					details: (error as any).details ?? null,
					hint: (error as any).hint ?? null,
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}

		return new Response(JSON.stringify({ pago: data }), { status: 200 });
	} catch (err: any) {
		return new Response(
			JSON.stringify({ error: err?.message || 'Internal server error' }),
			{ status: 500 },
		);
	}
};
