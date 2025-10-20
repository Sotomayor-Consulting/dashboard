// src/pages/api/admin/servicios/create.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/crud/services"; // Ajusta esta ruta según tu frontend

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const back = url.searchParams.get("back") || BACK_PATH;

  try {
    // 1) Verificar sesión
    const at = cookies.get("sb-access-token");
    const rt = cookies.get("sb-refresh-token");
    if (!at || !rt) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("No autenticado")}`);
    }
    await supabase.auth.setSession({
      access_token: at.value,
      refresh_token: rt.value,
    });

    // 2) Verificar que el usuario es admin
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

    // 3) Obtener datos del formulario
    const form = await request.formData();
    
    // Campos obligatorios
    const nombre = form.get("nombre-service")?.toString().trim();
    const precioRaw = form.get("precio-servicio")?.toString().trim();
    const categoria = form.get("categoria-service")?.toString().trim();
    const descripcion = form.get("descripcion-service")?.toString().trim();

    // Validar campos obligatorios
    if (!nombre) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("Falta el nombre del servicio")}`);
    }
    if (!precioRaw) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("Falta el precio del servicio")}`);
    }
    if (!categoria) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("Falta la categoría del servicio")}`);
    }
    if (!descripcion) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("Falta la descripción del servicio")}`);
    }

    // Validar precio
    const precio = Number(precioRaw);
    if (Number.isNaN(precio)) {
      return redirect(`${back}?status=error&msg=${encodeURIComponent("El precio debe ser un número válido")}`);
    }

    // 4) Preparar payload para INSERTAR
    const payload: Record<string, any> = {
      nombre: nombre,
      precio: precio,
      categoria: categoria,
      descripcion: descripcion,
      created_at: new Date().toISOString()
    };

    // 5) INSERTAR el nuevo servicio
    const { data, error } = await supabase
      .from("servicios")
      .insert(payload)
      .select();

    if (error) {
      const msg = encodeURIComponent(`Error al crear servicio: ${error.message}`);
      return redirect(`${back}?status=error&msg=${msg}`);
    }

    return redirect(`${back}?status=success&msg=${encodeURIComponent("Servicio creado correctamente")}`);

  } catch (e: any) {
    const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
    return redirect(`${back}?status=error&msg=${msg}`);
  }
};