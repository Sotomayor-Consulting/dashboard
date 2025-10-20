export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  // 1) Sesión
  const at = cookies.get("sb-access-token");
  const rt = cookies.get("sb-refresh-token");
  if (!at || !rt) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }
  await supabase.auth.setSession({ access_token: at.value, refresh_token: rt.value });

  // 2) Usuario
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  // 3) Rango opcional ?from=YYYY-MM-DD&to=YYYY-MM-DD
  const url  = new URL(request.url);
  const from = url.searchParams.get("from") || null;
  const to   = url.searchParams.get("to")   || null;

  // 4) Llamar a la RPC
  const { data, error } = await supabase.rpc("referrals_by_day", {
    p_partner: user.id,
    p_from: from,
    p_to: to,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  // 5) Adaptar a ApexCharts
  const categories = (data ?? []).map((r: any) =>
    new Date(r.day).toLocaleDateString()
  );
  const series = (data ?? []).map((r: any) => Number(r.total) || 0);

  return new Response(JSON.stringify({ categories, series }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
