import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con SERVICE ROLE para el backend
const supabaseAdmin = createClient(
  import.meta.env.SUPABASE_URL as string,
  import.meta.env.SUPABASE_ANON_KEY as string, 
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as {
      paymentIntentId?: string;
    } | null;

    if (!body || !body.paymentIntentId) {
      return new Response(
        JSON.stringify({ error: 'paymentIntentId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { paymentIntentId } = body;

    // Llamar a la función de Postgres
    const { data, error } = await supabaseAdmin.rpc(
      'registrar_pago_desde_stripe',
      { p_payment_intent_id: paymentIntentId },
    );

    if (error) {
      console.error('Error en registrar_pago_desde_stripe:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // data = JSON con el registro en la tabla "pagos"
    return new Response(
      JSON.stringify({ pago: data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Error en /api/payment/register:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
