// ─── Registrar pago desde Stripe (solo admin) ───────────
// Herramienta de recuperación manual: llama al RPC registrar_pago_desde_stripe
// con el paymentIntentId proporcionado. El flujo normal es el webhook; este
// endpoint queda restringido a admins porque el RPC usa service role y
// registraría cualquier PaymentIntent sin verificar a quién pertenece.
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { isAdmin } from '@shared/roles';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY =
	process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
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

	// ─── 1b) Solo admins ─────────────────────────────────
	if (!isAdmin(locals.userRoles ?? [])) {
		return new Response(JSON.stringify({ error: 'No autorizado' }), {
			status: 403,
			headers: SECURITY_HEADERS,
		});
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
		// El schema `stripe` (FDW) ya no existe: se recupera el PaymentIntent
		// de la API de Stripe y se pasa completo como jsonb al RPC.
		if (!stripe) {
			return new Response(
				JSON.stringify({ error: 'Stripe no configurado' }),
				{ status: 500, headers: SECURITY_HEADERS },
			);
		}
		const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
		const { data, error } = await supabaseAdmin.rpc(
			'registrar_pago_desde_stripe',
			{ p_payment_intent: pi as unknown as Record<string, unknown> },
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
