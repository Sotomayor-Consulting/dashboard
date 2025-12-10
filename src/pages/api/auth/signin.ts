// src/pages/api/auth/signin.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";

/**
 * Helper para redirigir con mensaje
 */
function redirectWithMessage(
  redirectFn: (path: string, status?: 301 | 302 | 303 | 307 | 308 | 300 | 304 | undefined) => Response,
  msg: string,
  statusType: "success" | "error" = "error",
) {
  const params = new URLSearchParams({
    status: statusType,
    msg,
  });

  return redirectFn(`/sign-in?${params.toString()}`);
}

/**
 * Devuelve la URL de callback para OAuth.
 * Prioriza la variable de entorno SUPABASE_OAUTH_REDIRECT_TO.
 * Si no existe, intenta construirla a partir del host de la petición.
 */
function buildRedirectTo(hostHeader?: string): string {
  // Preferimos variable de entorno para deploys
  const envRedirect = (process.env.SUPABASE_OAUTH_REDIRECT_TO || "").trim();
  if (envRedirect) return envRedirect;

  // Fallback: construir desde host (asegúrate que hostHeader sea algo del estilo 'dashboard.mydomain.com')
  if (hostHeader) {
    const scheme = process.env.NODE_ENV === "development" ? "http" : "https";
    return `${scheme}://${hostHeader}/api/auth/callback`;
  }

  // Último recurso: localhost (solo para dev)
  return "http://localhost:4321/api/auth/callback";
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const provider = formData.get("provider")?.toString();

  const validProviders = ["google"];

  // --- LOGIN CON OAUTH (GOOGLE) ---
  if (provider && validProviders.includes(provider)) {
    // Construimos redirectTo de forma segura
    // Si estás en production, pon SUPABASE_OAUTH_REDIRECT_TO en las env vars con 'https://tu-dominio/api/auth/callback'
    const redirectTo = buildRedirectTo(request.headers.get("host") || undefined);
    console.log("[signin] OAuth redirectTo:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("[signin] Error OAuth:", error);
      return redirectWithMessage(
        redirect,
        "No se pudo iniciar sesión con Google. Intenta de nuevo.",
      );
    }

    // data.url contiene la URL a la que redirigir al usuario para autorizar (supabase)
    return redirect(data.url);
  }

  // --- LOGIN CON EMAIL / PASSWORD ---
  if (!email || !password) {
    return redirectWithMessage(
      redirect,
      "Correo electrónico y contraseña son obligatorios.",
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[signin] Error login email/password:", error);
    return redirectWithMessage(
      redirect,
      "Correo o contraseña incorrectos. Revisa tus datos e inténtalo nuevamente.",
    );
  }

  // Asegurarnos de que data.session existe
  if (!data?.session) {
    console.error("[signin] No se recibió session en login email/password:", data);
    return redirectWithMessage(
      redirect,
      "No se pudo iniciar sesión. Inténtalo nuevamente.",
    );
  }

  const { access_token, refresh_token } = data.session;

  // Cookies: uso de flags seguros. Si necesitas que el cliente Javascript lea las cookies,
  // pon httpOnly: false, de lo contrario pon true para mayor seguridad.
  const cookieOpts = {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    sameSite: "none" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 días
  };

  if (access_token) {
    cookies.set("sb-access-token", access_token, cookieOpts);
  }
  if (refresh_token) {
    cookies.set("sb-refresh-token", refresh_token, cookieOpts);
  }

  return redirectWithMessage(
    redirect,
    "Sesión iniciada correctamente.",
    "success",
  );
};