// src/pages/api/charts/referrals-odoo.ts
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { getReferralsByEmail } from "../../../services/partnerService";

type Referral = {
  name: string;
  email?: string | null;
  create_date?: string;
};

export const GET: APIRoute = async ({ cookies, request }) => {
  // 1) Supabase client
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
  );

  const at = cookies.get("sb-access-token");
  const rt = cookies.get("sb-refresh-token");

  const accessToken = at?.value;
  const refreshToken = rt?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: "No autorizado: falta token de sesión" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2) Setear sesión
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionErr) {
    console.error("[CHART-ODOO] Error setSession:", sessionErr);
    return new Response(
      JSON.stringify({ error: "Sesión inválida o expirada" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3) Obtener usuario
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    console.error("[CHART-ODOO] Error getUser:", userErr);
    return new Response(
      JSON.stringify({ error: "Sesión inválida o sin email" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4) Llamar a Odoo
  const result = await getReferralsByEmail(user.email);

  if (!result?.success) {
    console.error("[CHART-ODOO] Odoo error:", result?.error);
    return new Response(
      JSON.stringify({ error: "No se pudieron obtener los referidos" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const data = (result.data ?? []) as Referral[];

  // 5) Agrupar por día
  const countsByDay = new Map<string, number>();

  for (const r of data) {
    if (!r.create_date) continue;

    // según formato de Odoo, suele ser "2024-11-28 15:30:22"
    const day = r.create_date.split(" ")[0]; // "YYYY-MM-DD"
    const prev = countsByDay.get(day) ?? 0;
    countsByDay.set(day, prev + 1);
  }

  // 6) Ordenar fechas
  const categories = Array.from(countsByDay.keys()).sort();
  const series = categories.map((d) => countsByDay.get(d) ?? 0);

  return new Response(
    JSON.stringify({
      categories,
      series,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
