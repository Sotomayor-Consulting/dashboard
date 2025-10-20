// src/pages/api/test/usuario.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/settings";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const back = url.searchParams.get("back") || BACK_PATH;

  // 1) Sesión
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) {
    const msg = encodeURIComponent("No autenticado");
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  await supabase.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  // 2) Usuario
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    const msg = encodeURIComponent("No autenticado");
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  // 3) Form data
  const form = await request.formData();

  // nombre / apellido (opcionales)
  const nombreRaw = form.get("nombre")?.toString().trim() ?? "";
  const apellidoRaw = form.get("apellido")?.toString().trim() ?? "";
  const paisIdRaw = form.get("pais")?.toString().trim() ?? "";
  const ciudadRaw = form.get("ciudad")?.toString().trim() ?? "";

  // 4) Payload dinámico: solo incluimos los campos con valor
  const payload: Record<string, any> = {
    user_id: user.id,
  };
  if (nombreRaw) payload.nombre = nombreRaw;
  if (apellidoRaw) payload.apellido = apellidoRaw;
  if (paisIdRaw) payload.pais_id = paisIdRaw;
  if (ciudadRaw) payload.ciudad = ciudadRaw;

  // 5) Upsert por user_id (sin duplicar filas)
  const { error } = await supabase
    .from("usuarios")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    const msg = encodeURIComponent(`DB: ${error.message}`);
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  const msg = encodeURIComponent("Datos guardados/actualizados");
  return redirect(`${back}?status=success&msg=${msg}`);
};
