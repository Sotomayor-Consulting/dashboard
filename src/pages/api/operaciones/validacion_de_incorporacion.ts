// src/pages/api/operaciones/validacion_de_incorporacion.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/operaciones/envios"; // <-- AJUSTA a tu vista/lista en Ops

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asString = (v: any) => (typeof v === "string" ? v.trim() : "");
const asBool = (v: any) => v === true || v === "Si" || v === "sí" || v === "SI";
const safeArray = (v: any) => (Array.isArray(v) ? v : []);

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const back = url.searchParams.get("back") || BACK_PATH;

  try {
    // 1) Sesión desde cookies
    const at = cookies.get("sb-access-token");
    const rt = cookies.get("sb-refresh-token");
    if (!at || !rt) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent("No autenticado")}`
      );
    }

    await supabase.auth.setSession({
      access_token: at.value,
      refresh_token: rt.value,
    });

    // 2) Usuario y autorización admin/ops
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const actor = userRes?.user;
    if (userErr || !actor) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent("No autenticado")}`
      );
    }

    // Si luego creas rol "ops", cambia a rpc('is_ops', { uid: actor.id })
    const { data: isAdminRes, error: rpcErr } = await supabase.rpc("is_admin", {
      uid: actor.id,
    });
    const isAdmin = !rpcErr && Boolean(isAdminRes);
    if (!isAdmin) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent("No autorizado")}`
      );
    }

    // 3) Body JSON (desde SurveyJS)
    const body = await request.json().catch(() => null);

    const submission_id = body?.submission_id?.toString().trim();
    const empresa_id = body?.empresa_id?.toString().trim();
    const approved_data = body?.approved_data;

    // 4) Validaciones mínimas (estructura / ids)
    if (!submission_id || !UUID_RE.test(submission_id)) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent("submission_id inválido")}`
      );
    }
    if (!empresa_id || !UUID_RE.test(empresa_id)) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent("empresa_id inválido")}`
      );
    }
    if (!approved_data || typeof approved_data !== "object") {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent(
          "approved_data debe ser un objeto JSON"
        )}`
      );
    }

    // 5) Anti-tampering: confirmar submission -> empresa_id
    const { data: envio, error: envioErr } = await supabase
      .from("formularios_envios")
      .select("submission_id, empresa_incorporacion_id, status, form_id")
      .eq("submission_id", submission_id)
      .single();

    if (envioErr || !envio) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent("Envío no encontrado")}`
      );
    }
    if (envio.empresa_incorporacion_id !== empresa_id) {
      return redirect(
        `${back}?status=error&msg=${encodeURIComponent(
          "Mismatch: envío no corresponde a esa empresa"
        )}`
      );
    }

    // 6) Guardar JSON aprobado + status
    const nowIso = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("formularios_envios")
      .update({
        respuestas_validadas: approved_data, // versión aprobada por Ops
        verificacion_operaciones: true,  // AJUSTA a tu enum
      })
      .eq("submission_id", submission_id);

    if (updErr) {
      const msg = `Error al guardar validación: ${updErr.message}`;
      return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
    }

    // 7) MAPEO + INSERTS (GUÍA mínima)
    //    Tú expandes el mapping. Este ejemplo solo muestra:
    //    - upsert empresa (2-3 campos)
    //    - upsert personas (por email)
    //    - roles (delete+insert por empresa_id) para idempotencia simple
    //
    //    Si todavía no quieres mapear nada, puedes comentar todo este bloque.
    const socios = safeArray(approved_data?.panel_socios);

    // Empresa (mínimo)
    const companyRow = {
      id: empresa_id,
      Obtendra_ingresos_desde_eeuu: asBool(approved_data?.ingresos_provenientes_de_Estados_Unidos),
      actividad_no_listada: asString(approved_data?.Estado) || null,
      actividad: asString(approved_data?.Actividad) || null,
      forma_administracion: asString(approved_data?.forma_administracion) || null,
      forma_tributacion: asString(approved_data?.forma_tributacion) || null,
      direccion_operativa_eeuu: asString(approved_data?.direccion_operativa_eeuu) || null,
      direccion_eeuu: asString(approved_data?.Direccion) || null,
      condado_eeuu: asString(approved_data?.Condado) || null,
      ciudad_eeuu: asString(approved_data?.Ciudad) || null,
      estado_eeuu: asString(approved_data?.Estado) || null,
      codigo_postal_eeuu: asString(approved_data?.codigo_postal) || null,
      Pais_operativo: asString(approved_data?.Pais_) || null,
      direccion_empresa: asString(approved_data?.direccion_empresa) || null,
      fecha_de_validacion: nowIso,
    };

    const { error: upCompanyErr } = await supabase
      .from("empresas_incorporacion")
      .upsert(companyRow, { onConflict: "id" });

    if (upCompanyErr) {
      const msg = `Error upsert empresa: ${upCompanyErr.message}`;
      return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
    }

    // Personas (socios) - guía mínima (por email)
    const peopleRows = socios
      .map((s: any) => ({
        tipo_de_socio: asString(s?.tipo_socio) || null,
        nombre_de_socio: asString(s?.Nombres_completos) || null,
        correo: asString(s?.correoelectronico).toLowerCase() || null,
        porcentaje: asString(s?.porcentaje) || null,
        estado_civil: asString(s?.estado_civil) || null,
        residente_fiscal: asString(s?.residente_fiscal_eeuu) || null,
        numero_de_pasaporte: asString(s?.numero_pasaporte) || null,
        nacionalidad: asString(s?.pais_de_nacionalidad) || null,
        numero_de_seguro_social: asString(s?.ssn) || null,
        numero_itin: asString(s?.itin) || null,
        pais_planilla: asString(s?.pais_factura_servicio_basico) || null,
        direccion_planilla: asString(s?.direccion_planilla_socio) || null,
        updated_at: nowIso,
      }))
      .filter((p: any) => p.email); // evita upserts con email null

    const { data: peopleUp, error: upPeopleErr } = await supabase
      .from("personas")
      .upsert(peopleRows, { onConflict: "email" })
      .select("id, email");

    if (upPeopleErr) {
      const msg = `Error upsert personas: ${upPeopleErr.message}`;
      return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
    }

    const personIdByEmail = new Map<string, string>();
    for (const p of peopleUp ?? []) {
      if (p.email) personIdByEmail.set(String(p.email).toLowerCase(), p.id);
    }

    // Roles (idempotente simple)
    const { error: delRolesErr } = await supabase
      .from("empresa_roles")
      .delete()
      .eq("empresa_id", empresa_id);

    if (delRolesErr) {
      const msg = `Error limpiando roles: ${delRolesErr.message}`;
      return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
    }

    const roleRows = socios
      .map((s: any) => {
        const email = asString(s?.correoelectronico).toLowerCase();
        const persona_id = personIdByEmail.get(email);
        if (!persona_id) return null;

        return {
          empresa_id,
          persona_id,
          role_type: "owner",
          ownership_pct: Number(s?.Porcentaje) || null,
          created_at: nowIso,
        };
      })
      .filter(Boolean);

    if (roleRows.length > 0) {
      const { error: insRolesErr } = await supabase
        .from("empresa_roles")
        .insert(roleRows);

      if (insRolesErr) {
        const msg = `Error insert roles: ${insRolesErr.message}`;
        return redirect(`${back}?status=error&msg=${encodeURIComponent(msg)}`);
      }
    }

    // 8) OK
    return redirect(
      `${back}?status=success&msg=${encodeURIComponent(
        "Validación guardada correctamente"
      )}&submission_id=${encodeURIComponent(submission_id)}&empresa_id=${encodeURIComponent(empresa_id)}`
    );
  } catch (e: any) {
    const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
    return redirect(`${back}?status=error&msg=${msg}`);
  }
};
