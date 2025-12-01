export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  try {
    // 1) Verificar sesión
    const at = cookies.get("sb-access-token");
    const rt = cookies.get("sb-refresh-token");
    
    if (!at || !rt) {
      return redirect("/login?error=No autenticado");
    }

    // Establecer sesión en supabase
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: at.value,
      refresh_token: rt.value,
    });

    if (sessionError) {
      return redirect("/login?error=Sesión inválida");
    }

    // 2) Obtener usuario actual
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    
    if (userErr || !userRes?.user) {
      return redirect("/login?error=Error de autenticación");
    }

    const actor = userRes.user;
    const actorId = actor.id;

    // 3) Obtener parámetros de la URL
    const searchParams = new URLSearchParams(url.search);
    const targetUserId = searchParams.get("user_id");
    const filename = searchParams.get("filename");
    const mode = searchParams.get("mode") || "view"; // 'view' o 'download'

    // Validar parámetros requeridos
    if (!targetUserId || !filename) {
      return new Response(
        "Error: Se requieren user_id y filename como parámetros de consulta",
        { status: 400 }
      );
    }

    // 4) Verificar que el usuario solo pueda acceder a sus propios documentos
    if (actorId !== targetUserId) {
      return new Response(
        "No autorizado: Solo puedes acceder a tus propios documentos",
        { status: 403 }
      );
    }

    // 5) Construir ruta del archivo
    const filePath = `${targetUserId}/contratos-partner/${filename}`;
    
    // 6) Generar URL firmada (1 hora = 3600 segundos)
    const { data, error } = await supabase.storage
      .from("documentos_usuarios")
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error("Error generando URL firmada:", error);
      if (error.message?.includes("not found") || error.message?.includes("No such file")) {
        return new Response(
          `Documento no encontrado: ${filename}`,
          { status: 404 }
        );
      }
      return new Response(
        `Error al generar enlace: ${error.message}`,
        { status: 500 }
      );
    }

    // 7) Si el modo es 'view' hacemos redirect (abrir en nueva pestaña)
    if (mode === "view") {
      return redirect(data.signedUrl);
    }

    // 8) Si el modo es 'download' usamos proxy para forzar Content-Disposition
    // Sanitizar filename básico: quitar saltos de línea y comillas
    const safeFileName = filename.replace(/[\r\n"]/g, "").trim() || "download.pdf";
    // opcional: limitar longitud
    const MAX_FILENAME_LEN = 100;
    const finalFileName =
      safeFileName.length > MAX_FILENAME_LEN
        ? safeFileName.slice(0, MAX_FILENAME_LEN)
        : safeFileName;

    // Fetch al signed URL (stream)
    const fetched = await fetch(data.signedUrl);

    if (!fetched.ok || !fetched.body) {
      console.error("Error al obtener el archivo desde signedUrl:", fetched.status, fetched.statusText);
      return new Response(`Error al obtener archivo: ${fetched.statusText}`, { status: fetched.status || 500 });
    }

    // Construir headers de respuesta para forzar descarga
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    // Usamos filename* para UTF-8 seguro y fallback filename
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
    );
    // Opcionales: cache-control
    headers.set("Cache-Control", "no-store");

    // Devolver el stream directamente al cliente con los headers
    return new Response(fetched.body, {
      status: 200,
      headers,
    });

  } catch (e: any) {
    console.error("Error inesperado:", e);
    return new Response(
      `Error inesperado: ${e?.message ?? e}`,
      { status: 500 }
    );
  }
};