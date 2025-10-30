// src/pages/api/generales/estado-incorporacion.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase'; // Ajusta tu ruta

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    // === 1. OBTENER empresaId DEL QUERY ===
    const empresaId = url.searchParams.get('empresaId');
    console.log('empresaId recibido:', empresaId);

    let data: any;

    if (empresaId) {
      // === BUSCAR POR empresa_incorporacion_id (TU PK) ===
      const { data: queryData, error } = await supabase
        .from('empresas_incorporaciones')
        .select('estado_de_incorporacion')
        .eq('empresa_incorporacion_id', empresaId)  // ← CAMPO CORRECTO
        .single();

      if (error) {
        console.error('Error Supabase:', error);
        return new Response(
          JSON.stringify({ error: 'Empresa no encontrada', details: error.message }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      data = queryData;
      console.log('Datos por empresaId:', data);

    } else {
      // === SIN empresaId: BUSCAR POR USUARIO (lógica anterior) ===
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'No autenticado' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { data: queryData, error } = await supabase
        .from('empresas_incorporaciones')
        .select('estado_de_incorporacion')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !queryData) {
        return new Response(
          JSON.stringify({ error: 'No hay empresas' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      data = queryData;
      console.log('Datos por usuario:', data);
    }

    // === RESPUESTA EXITOSA ===
    return new Response(
      JSON.stringify({ estado: data.estado_de_incorporacion }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error general:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};