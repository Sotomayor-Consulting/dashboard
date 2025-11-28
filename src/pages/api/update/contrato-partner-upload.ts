// src/pages/api/contract/upload.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const DEFAULT_BACK_PATH = "/partners/configuracion-partners/";
const BUCKET_NAME = "documentos_usuarios";
const RLS_SUB_FOLDER = "contratos-partner";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = "application/pdf";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const back = url.searchParams.get("back") || DEFAULT_BACK_PATH;

  const redirectWithStatus = (status: "success" | "error", msg: string) =>
    redirect(`${back}?status=${status}&msg=${encodeURIComponent(msg)}`);

  try {
    // 1) Recuperar tokens desde cookies (con validación segura)
    const at = cookies.get("sb-access-token");
    const rt = cookies.get("sb-refresh-token");

    if (!at?.value || !rt?.value) {
      return redirectWithStatus("error", "No autenticado (falta sesión)");
    }

    // 2) Establecer sesión en Supabase
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: at.value,
      refresh_token: rt.value,
    });

    if (sessionErr) {
      console.error("[UPLOAD-CONTRACT] Error al setear sesión:", sessionErr);
      return redirectWithStatus("error", "No autenticado (sesión inválida)");
    }

    const { data: userData, error: uerr } = await supabase.auth.getUser();
    const user = userData?.user;

    if (uerr || !user) {
      console.error("[UPLOAD-CONTRACT] Error al obtener usuario:", uerr);
      return redirectWithStatus("error", "No autenticado");
    }

    // 3) Leer formulario y validar archivo
    const form = await request.formData();
    const file = form.get("contract_file") as File | null;

    if (!file) {
      return redirectWithStatus("error", "Archivo obligatorio");
    }

    if (file.size === 0) {
      return redirectWithStatus("error", "El archivo está vacío");
    }

    if (file.type !== ALLOWED_MIME) {
      return redirectWithStatus("error", "Solo se permiten archivos PDF");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return redirectWithStatus("error", "El archivo no puede superar 5MB");
    }

   
    const fileName = "contrato_firmado.pdf";
    const filePath = `${user.id}/${RLS_SUB_FOLDER}/${fileName}`;

    // 4) Subir el archivo al Storage
    const { error: upErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        upsert: true,
        contentType: ALLOWED_MIME,
      });

    if (upErr) {
      console.error("[UPLOAD-CONTRACT] Error al subir a Storage:", upErr);
      return redirectWithStatus("error", "Error al subir el archivo al servidor");
    }

    // 5) Guardar metadatos en la tabla

    const { error: upsertErr } = await supabase
      .from("documentos_usuarios")
      .upsert(
        {
          user_id: user.id,
          tipo_documento: "contrato-partner",
          nombre_archivo: fileName,
          url_archivo: filePath,
          estado: "subido",
        }
      );

    if (upsertErr) {
      console.error("[UPLOAD-CONTRACT] Error al guardar metadatos:", upsertErr);
      return redirectWithStatus("error", "Error al registrar el archivo en la base de datos");
    }

    // 6) OK
    return redirectWithStatus("success", "Contrato subido y registrado correctamente");
  } catch (e: unknown) {
    console.error("[UPLOAD-CONTRACT] Excepción no controlada:", e);

    const msg =
      e && typeof e === "object" && "message" in e && typeof (e as any).message === "string"
        ? (e as any).message
        : "Error inesperado al subir el contrato";

    
    return redirect(`${DEFAULT_BACK_PATH}?status=error&msg=${encodeURIComponent(msg)}`);
  }
};
