// /api/payment/register
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

function jwtRole(jwt: string | undefined) {
  try {
    if (!jwt) return null;
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
    return payload?.role ?? null;
  } catch { return null; }
}

export const POST: APIRoute = async ({ request }) => {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceKey) {
    // 👉 si ves este error en consola, el problema es que NO estás cargando la SERVICE_ROLE en tu .env/dev/Netlify
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }
  // Logea SOLO el rol para confirmar que es service_role
  console.log('[register] using role:', jwtRole(serviceKey)); // debe imprimir "service_role"

  const supabaseAdmin = createClient(
    import.meta.env.SUPABASE_URL as string,
    serviceKey
  );

  try {
    const { paymentIntentId } = await request.json() as { paymentIntentId?: string };
    if (!paymentIntentId) return new Response(JSON.stringify({ error: 'paymentIntentId is required' }), { status: 400 });

    const { data, error } = await supabaseAdmin.rpc(
      'registrar_pago_desde_stripe',
      { p_payment_intent_id: paymentIntentId }
    );

    if (error) {
      // Devuelve el motivo REAL del permiso denegado (temporal para depurar)
      return new Response(JSON.stringify({
        error: error.message, code: (error as any).code ?? null,
        details: (error as any).details ?? null, hint: (error as any).hint ?? null
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ pago: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), { status: 500 });
  }
};
