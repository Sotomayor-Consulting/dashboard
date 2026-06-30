import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('billing.update-invoice');

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({
    headers: request.headers,
    cookies,
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: SECURITY_HEADERS,
    });
  }

  try {
    const body = await request.json();

    const {
      country_id,
      state_id,
      city,
      line1,
      line2,
      zip,
      phone,
      email,
      is_default,
    } = body;

    if (!country_id || !city || !line1) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios: country_id, city, line1' }),
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      country_id: Number(country_id),
      city: String(city).trim(),
      line1: String(line1).trim(),
    };

    if (state_id) payload.state_id = Number(state_id);
    if (line2) payload.line2 = String(line2).trim();
    if (zip) payload.zip = String(zip).trim();
    if (phone) payload.phone = String(phone).trim();
    if (email) payload.email = String(email).trim();
    if (typeof is_default === 'boolean') payload.is_default = is_default;

    const { data, error } = await supabaseAdmin
      .from('billing_info')
      .upsert(payload, { onConflict: 'user_id' })
      .select('id')
      .single();

    if (error) {
      log.error('upsert error', { error });
      return new Response(JSON.stringify({ error: 'Error al guardar datos de facturación' }), {
        status: 400,
        headers: SECURITY_HEADERS,
      });
    }

    return new Response(JSON.stringify({ id: data?.id }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (e: unknown) {
    log.error('exception', { error: e });
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
