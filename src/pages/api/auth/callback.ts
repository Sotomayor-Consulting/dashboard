// src/pages/api/auth/callback.ts
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase-ssr";

// helper para redirigir con mensaje
function redirectWithMessage(
  redirectFn: (
    location: string,
    status?:
      | 301
      | 302
      | 303
      | 307
      | 308
      | 300
      | 304
      | undefined,
  ) => Response,
  msg: string,
  statusType: "success" | "error" = "error",
  route: string = "/sign-in",
) {
  const params = new URLSearchParams({
    status: statusType,
    msg,
  });

  const finalUrl = `${route}?${params.toString()}`;
  console.log("[callback] redirectWithMessage ->", finalUrl);

  return redirectFn(finalUrl);
}

export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
  console.log("========== [callback] INICIO ==========");
  console.log("[callback] URL completa:", url.toString());
  console.log(
    "[callback] Query params:",
    Object.fromEntries(url.searchParams.entries()),
  );

  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");

  if (oauthError) {
    console.error(
      "[callback] Error de OAuth Google:",
      oauthError,
      oauthErrorDescription,
    );

    console.log("[callback] Saliendo por rama de error de OAuth");
    return redirectWithMessage(
      redirect,
      oauthErrorDescription ||
        "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.",
      "error",
    );
  }

  const authCode = url.searchParams.get("code");
  console.log("[callback] authCode:", authCode);

  if (!authCode) {
    console.warn("[callback] NO se recibió 'code' en la URL");
    return redirectWithMessage(
      redirect,
      "No se proporcionó ningún código de autorización. Vuelve a intentar iniciar sesión.",
      "error",
    );
  }

  const supabase = createSupabaseServerClient({
    headers: request.headers,
    cookies,
  });

  console.log(
    "[callback] Intentando exchangeCodeForSession con Supabase (SSR PKCE)...",
  );

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      authCode,
    );

    console.log("[callback] Resultado exchangeCodeForSession -> error:", error);
    console.log(
      "[callback] Resultado exchangeCodeForSession -> data.session existe?:",
      !!data?.session,
    );

    if (error || !data?.session) {
      console.error(
        "[callback] Error al intercambiar código por sesión:",
        error,
      );

      return redirectWithMessage(
        redirect,
        "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.",
        "error",
      );
    }

    const { access_token, refresh_token } = data.session;

    console.log(
      "[callback] access_token (primeros 15 chars):",
      access_token?.slice(0, 15) + "...",
    );
    console.log(
      "[callback] refresh_token (primeros 15 chars):",
      refresh_token?.slice(0, 15) + "...",
    );

    // 🔑 AQUÍ ES DONDE FALTABA: replicar tus cookies custom
    console.log(
      "[callback] Seteando cookies custom sb-access-token y sb-refresh-token...",
    );

    cookies.set("sb-access-token", access_token, {
      path: "/",
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
    });

    console.log(
      "[callback] Cookies custom seteadas. Redirigiendo al home con éxito...",
    );
    console.log("========== [callback] FIN (SUCCESS) ==========");

    return redirectWithMessage(
      redirect,
      "Sesión iniciada correctamente con Google.",
      "success",
      "/", // → "/?status=success&msg=..."
    );
  } catch (err) {
    console.error(
      "[callback] EXCEPCIÓN al hacer exchangeCodeForSession:",
      err,
    );
    console.log("========== [callback] FIN (EXCEPTION) ==========");

    return redirectWithMessage(
      redirect,
      "Ocurrió un error interno al procesar el inicio de sesión. Inténtalo nuevamente.",
      "error",
    );
  }
};
