// src/pages/api/payment/register.ts
// ─── Registrar pago desde Stripe ────────────────────────
// Requiere autenticación. Llama al RPC registrar_pago_desde_stripe
// con el paymentIntentId proporcionado.
import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '@lib/supabase';
import { SECURITY_HEADERS } from '@lib/security/headers';

export const POST: APIRoute = async ({ request, cookies }) => {
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
		return new Response(
			JSON.stringify({ error: 'No autenticado' }),
			{
				status: 401,
				headers: SECURITY_HEADERS,
			},
		);
	}

	try {
		// ─── 2) Parsear body ─────────────────────────────
		const { paymentIntentId } = (await request.json()) as {
			paymentIntentId?: string;
		};

		if (!paymentIntentId) {
			return new Response(
				JSON.stringify({ error: 'paymentIntentId is required' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// ─── 3) Registrar pago via RPC (supabaseAdmin) ──
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
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		return new Response(JSON.stringify({ pago: data }), {
			status: 200,
			headers: SECURITY_HEADERS,
		});
	} catch (err: any) {
		return new Response(
			JSON.stringify({ error: err?.message || 'Internal server error' }),
			{
				status: 500,
				headers: SECURITY_HEADERS,
			},
		);
	}
};
