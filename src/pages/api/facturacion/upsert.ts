// src/pages/api/billing/upsert.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL as string,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string // clave de backend (no exponer)
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Campos esperados desde el front (usa tus IDs actuales)
    const {
      userId,         
      persona,                // "natural" | "juridica"
      nombre_razon,
      email,    
      telefono_numero,        // ej. "0999999999"
      id_tipo,                // "Cedula" | "RUC" | "ID" | "Pasaporte" | "EIN"
      id_numero,
      direccion,
      ciudad,
      pais,                   // ISO del país (según tu select)
    } = body || {};

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Normalizar personería (usa exactamente el nombre de tu columna con tilde)
    const row: Record<string, any> = {
      user_id: userId,
      nombre_o_razon_social: nombre_razon || '',
      correo: email || '',
      telefono: telefono_numero || '',
      documento_de_identidad: id_numero || '',
      direccion_linea_1: direccion || '',
      ciudad: ciudad || '',
      pais: pais || '',
      tipo_de_documento: id_tipo || '',
    };
    // columna con tilde
    row['personería'] = (persona || '').toLowerCase(); // "natural" | "juridica"

    // Insertar
    const { data, error } = await supabase
      .from('facturacion')
      .insert([row])
      .select('id')
      .single();

    if (error) {
      console.error('[billing/upsert] insert error:', error);
      return new Response(JSON.stringify({ error: 'Insert failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ id: data?.id || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('[billing/upsert] exception:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
