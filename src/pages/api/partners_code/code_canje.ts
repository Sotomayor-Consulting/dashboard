// src/pages/api/referidos/canjear.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/settings";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const back = url.searchParams.get("back") || BACK_PATH;

  // 1) Sesión (mismo patrón que tu endpoint que funciona)
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

  // 2) Usuario autenticado
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    const msg = encodeURIComponent("No autenticado");
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  // 3) Form data (input name="code")
  const form = await request.formData();
  const codeRaw = form.get("code")?.toString() ?? "";
  const code = codeRaw.trim().toUpperCase();
  if (!code) {
    const msg = encodeURIComponent("Ingrese un código válido");
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  // (Opcional) Validaciones previas para mejor UX
  // - Verificar que aún no tenga partner y que sea rol 3 (cliente)
  const { data: meRow, error: meErr } = await supabase
    .from("usuarios")
    .select("rol_id, referido_por")
    .eq("user_id", user.id)
    .single();

  if (meErr || !meRow) {
    const msg = encodeURIComponent("Usuario no encontrado");
    return redirect(`${back}?status=error&msg=${msg}`);
  }
  if (meRow.referido_por) {
    const msg = encodeURIComponent("Ya tiene un partner asignado");
    return redirect(`${back}?status=error&msg=${msg}`);
  }
  if (Number(meRow.rol_id) !== 3) {
    const msg = encodeURIComponent("Solo clientes pueden canjear el código");
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  // 4) Ejecutar RPC (usa tu función en DB)
  const { error } = await supabase.rpc("apply_referral_code", {
    p_user_id: user.id,
    p_code: code,
  });

  if (error) {
    // Mapea mensajes a algo más legible
    const raw = error.message || "";
    const friendly =
      raw.includes("vacío") ? "El código no puede estar vacío." :
      raw.includes("inválido") ? "El código no existe." :
      raw.includes("sí mismo") ? "No puede usar su propio código." :
      raw.includes("partner asignado") ? "Ya tiene un partner asignado." :
      "No se pudo canjear el código. Intente nuevamente.";

    const msg = encodeURIComponent(friendly);
    return redirect(`${back}?status=error&msg=${msg}`);
  }

  // 5) OK
  const msg = encodeURIComponent("Código canjeado con éxito");
  return redirect(`${back}?status=success&msg=${msg}`);
};
