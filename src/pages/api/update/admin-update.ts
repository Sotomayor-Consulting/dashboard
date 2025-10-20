// src/pages/api/admin/usuarios/update.ts
export const prerender = false;

import type { APIRoute } from "astro";
// Ajusta esta ruta si tu estructura es distinta:
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/crud/users";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const back = url.searchParams.get("back") || BACK_PATH;

  try {
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

    // 2) Actor + check admin
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const actor = userRes?.user;
    if (userErr || !actor) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("No autenticado")}`);
    }

    const { data: isAdminRes, error: rpcErr } = await supabase.rpc("is_admin", { uid: actor.id });
    const isAdmin = !rpcErr && Boolean(isAdminRes);
    if (!isAdmin) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("No autorizado")}`);
    }

    // 3) Form data
    const form = await request.formData();
    const targetUserId = form.get("user_id")?.toString();
    if (!targetUserId) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("Falta user_id de destino")}`);
    }

    // Campos opcionales (solo actualizamos si llegan con valor no vacío)
    const nombre = form.get("nombre")?.toString().trim();
    const apellido = form.get("apellido")?.toString().trim();
    const correo = form.get("correo")?.toString().trim();
    const organizacion = form.get("compania")?.toString().trim();
    const rolIdRaw = form.get("rol_id")?.toString().trim();
    const estado = form.get("estado")?.toString().trim();

    // 4) Build payload (no sobrescribe con strings vacíos)
    const payload: Record<string, any> = {};

    if (nombre) payload.nombre = nombre;
    if (apellido) payload.apellido = apellido;
    if (correo)  payload.correo = correo; // ⚠️ Esto NO cambia el email de auth.users, solo tu tabla
    if (organizacion) payload.organizacion = organizacion;
    if (estado) payload.estado = estado;
    

    // rol (admin puede cambiar)
    if (rolIdRaw !== undefined && rolIdRaw !== "") {
      const rid = Number(rolIdRaw);
      if (!Number.isNaN(rid)) payload.rol_id = rid;
    }

    // (Opcional) marca de tiempo
    // payload.updated_at = new Date().toISOString();

    if (Object.keys(payload).length === 0) {
      // Nada que actualizar
      return redirect(`${back}?status=success&msg=${encodeURIComponent("Sin cambios")}`);
    }

    // 5) Update por user_id
    const { error } = await supabase
      .from("usuarios")
      .update(payload)
      .eq("user_id", targetUserId);

    if (error) {
      const msg = encodeURIComponent(`DB: ${error.message}`);
      return redirect(`${back}?status=error&msg=${msg}`);
    }

    return redirect(`${back}?status=success&msg=${encodeURIComponent("Usuario actualizado")}`);
  } catch (e: any) {
    const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
    return redirect(`${back}?status=error&msg=${msg}`);
  }
};
