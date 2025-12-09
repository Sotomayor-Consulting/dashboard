import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  // Si tu invitación entrega un "code" igual que OAuth:
  const authCode = url.searchParams.get("code");

  // O si el invite usa un token directo:
  const inviteToken = url.searchParams.get("token");

  try {
    if (authCode) {
      // Intercambia código por sesión (como en tu ejemplo)
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) return new Response(error.message, { status: 500 });

      const { access_token, refresh_token } = data.session ?? {};

      if (!access_token || !refresh_token) {
        return new Response("No se recibieron tokens en la sesión", { status: 500 });
      }

      cookies.set("sb-access-token", access_token, { path: "/", httpOnly: true, sameSite: "lax" });
      cookies.set("sb-refresh-token", refresh_token, { path: "/", httpOnly: true, sameSite: "lax" });

      return redirect("/");
    }

    if (inviteToken) {
      // Si tu backend acepta un token de invitación para crear sesión
      // Usamos la API REST de Supabase Auth para intercambiar token (opcional).
      // Aquí ejemplo usando supabase.auth.api (dependiendo versión del cliente puede variar).
      // Intentamos iniciar sesión con el token como si fuera un OTP/confirmación.
      const { data, error } = await supabase.auth.verifyOTP({
        type: "signup", // o "invite" según tu implementación (ajusta si no aplica)
        token: inviteToken
      } as any); // casting porque la API varía entre versiones

      if (error) return new Response(error.message, { status: 500 });
      const session = (data as any)?.session;
      if (!session) return new Response("No se pudo obtener sesión desde el token de invitación", { status: 500 });

      cookies.set("sb-access-token", session.access_token, { path: "/", httpOnly: true, sameSite: "lax" });
      cookies.set("sb-refresh-token", session.refresh_token, { path: "/", httpOnly: true, sameSite: "lax" });

      return redirect("/");
    }

    return new Response("Parámetros inválidos: se requiere 'code' o 'token'", { status: 400 });
  } catch (err: any) {
    console.error("Invite callback error:", err);
    return new Response(err?.message ?? "Error interno", { status: 500 });
  }
};