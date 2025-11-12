import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe backend
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string);

// Supabase backend (SERVICE ROLE en backend; ANON como fallback)
const supabase = createClient(
  import.meta.env.SUPABASE_URL as string,
  (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) || (import.meta.env.SUPABASE_ANON_KEY as string),
);

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1) Body: requerimos empresaId
    const body = (await request.json().catch(() => null)) as {
      planId?: string;
      userId?: string;     // UUID del usuario
      empresaId?: string;  // UUID de empresas_incorporaciones.empresa_incorporacion_id
    } | null;

    if (!body || !body.planId || !body.userId || !body.empresaId) {
      return new Response(JSON.stringify({ error: 'Missing planId, userId or empresaId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { planId, userId, empresaId } = body;

    // 2) Servicio vigente (precio/activo)
    const { data: servicio, error: serviciosErr } = await supabase
      .from('servicios')
      .select('id_servicios, nombre, precio, servicio_activo')
      .eq('id_servicios', planId)
      .eq('servicio_activo', true)
      .single();

    if (serviciosErr || !servicio) {
      console.error('Servicio no encontrado o inactivo:', serviciosErr);
      return new Response(JSON.stringify({ error: 'Servicio no encontrado o inactivo' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3) Montos (USD→centavos) + 4.5% fee
    const baseAmountCents = Math.round(Number(servicio.precio) * 100);
    const feePercent = 0.045;
    const totalAmountCents = Math.round(baseAmountCents * (1 + feePercent));

    if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
      console.error('Monto inválido para servicio:', servicio);
      return new Response(JSON.stringify({ error: 'Monto inválido para el servicio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4) Metadata para Stripe (coincide con la función SQL)
    const metadata: Record<string, string> = {
      servicio_id: String(servicio.id_servicios),
      user_id: String(userId),
      empresa_incorporacion_id: String(empresaId),
      base_amount_cents: String(baseAmountCents),
      fee_percent: String(feePercent * 100), // "4.5"
    };

    // 5) PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmountCents,
        currency: 'usd',
        description: servicio.nombre ?? 'Servicio LLC',
        metadata,
        payment_method_types: ['card'],
      }
      // , { idempotencyKey: `pi:${userId}:${planId}:${empresaId}:${totalAmountCents}` } // opcional
    );

    // 6) Respuesta
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error en create-payment-intent:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
