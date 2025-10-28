export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  try {
    const back = url.searchParams.get("back") || BACK_PATH;

    // 1) Sesión
    const at = cookies.get("sb-access-token");
    const rt = cookies.get("sb-refresh-token");
    if (!at || !rt) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("No autenticado")}`);
    }
    await supabase.auth.setSession({
      access_token: at.value,
      refresh_token: rt.value,
    });

    // 2) Usuario
    const { data: userRes, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userRes?.user) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("No autenticado")}`);
    }

    // 3) Form data
    const form = await request.formData();
    const tipo_de_empresa = form.get("tipo_de_empresa")?.toString();
    const estado_de_empresa = form.get("estado_de_empresa")?.toString();
    const nombre_1 = form.get("nombre_1")?.toString() || '';
    const nombre_2 = form.get("nombre_2")?.toString() || '';
    const nombre_3 = form.get("nombre_3")?.toString() || '';
    const estado_de = form.get("estado_de")?.toString();

    // 4) Validaciones - CORREGIDAS
    if (!tipo_de_empresa) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("El tipo de empresa es obligatorio")}`);
    }
    if (!estado_de_empresa) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("El estado de incorporación es obligatorio")}`);
    }

    // Validar que al menos un nombre no esté vacío - CORREGIDO
    const nombres = [nombre_1, nombre_2, nombre_3];
    const alMenosUnNombre = nombres.some(nombre => nombre && nombre.trim() !== '');
    if (!alMenosUnNombre) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("Al menos un nombre de empresa es obligatorio")}`);
    }

    // 5) Insert
    const { error } = await supabase
      .from("empresas_incorporaciones")
      .insert([
        {
          user_id: userRes.user.id,
          tipo_de_negocio: tipo_de_empresa,
          estado_de_incorporacion: estado_de_empresa,
          nombre_1: nombre_1.trim() || null,
          nombre_2: nombre_2.trim() || null,
          nombre_3: nombre_3.trim() || null,
          estado: estado_de,
        },
      ]);

    if (error) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("DB: " + error.message)}`);
    }

    // 6) OK
    return redirect(`${back}?status=success&msg=${encodeURIComponent("Empresa registrada")}`);
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Error inesperado";
    return redirect(`${BACK_PATH}?status=error&msg=${encodeURIComponent(msg)}`);
  }
};