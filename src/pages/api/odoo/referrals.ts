import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { getReferralsByEmail } from "../../../services/partnerService";

export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  // 1) Leer cookies
  const at = cookies.get("sb-access-token");
  const rt = cookies.get("sb-refresh-token");

  const accessToken = at?.value;
  const refreshToken = rt?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: "No autorizado: Falta token de sesión" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2) Setear sesión con Supabase
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionErr) {
    console.error("[ODOO] Error setSession:", sessionErr);
    return new Response(
      JSON.stringify({ error: "Sesión inválida o expirada" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3) Obtener usuario actual
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    return new Response(
      JSON.stringify({ error: "Sesión inválida o sin email" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4) Usar el email verificado para llamar a Odoo
  const result = await getReferralsByEmail(user.email);

  // 5) Responder
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
