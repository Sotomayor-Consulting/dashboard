import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

// helper para redirigir con mensaje
function redirectWithMessage(
  redirectFn: (location: string, status?: 301 | 302 | 303 | 307 | 308 | 300 | 304) => Response,
  msg: string,
  statusType: "success" | "error" = "error",
  route: string = "/sign-in",
) {
  const params = new URLSearchParams({
    status: statusType,
    msg,
  });

  return redirectFn(`${route}?${params.toString()}`);
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  // 1) Si Google devuelve un error (usuario cancela, etc.)
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");

  if (oauthError) {
    console.error("Error de OAuth Google:", oauthError, oauthErrorDescription);

    return redirectWithMessage(
      redirect,
      oauthErrorDescription ||
        "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.",
      "error",
    );
  }

  // 2) Código de autorización
  const authCode = url.searchParams.get("code");

  if (!authCode) {
    return redirectWithMessage(
      redirect,
      "No se proporcionó ningún código de autorización. Vuelve a intentar iniciar sesión.",
      "error",
    );
  }

  // 3) Intercambiamos el código por la sesión
  const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

  if (error || !data.session) {
    console.error("Error al intercambiar código por sesión:", error);

    return redirectWithMessage(
      redirect,
      "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.",
      "error",
    );
  }

  const { access_token, refresh_token } = data.session;

  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });

  // Puedes redirigir directo al dashboard o pasar por sign-in con mensaje
  return redirectWithMessage(
    redirect,
    "Sesión iniciada correctamente con Google.",
    "success",
    "/", // si prefieres ir directo al dashboard con el query (?status=success...)
  );
};
