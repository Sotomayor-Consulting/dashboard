// src/pages/api/auth/signin.ts
import type { APIRoute } from "astro";
import type { Provider } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../lib/supabase-ssr";

// helpercito para no repetir código
function redirectWithMessage(
  redirectFn: (
    path: string,
    status?: 301 | 302 | 303 | 307 | 308 | 300 | 304 | undefined,
  ) => Response,
  msg: string,
  statusType: "success" | "error" = "error",
) {
  const params = new URLSearchParams({
    status: statusType,
    msg,
  });

  const finalUrl = `/sign-in?${params.toString()}`;
  console.log("[signin] redirectWithMessage ->", finalUrl);

  return redirectFn(finalUrl);
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // 🔐 Cliente SSR (maneja PKCE y cookies entre peticiones)
  const supabase = createSupabaseServerClient({
    headers: request.headers,
    cookies,
  });

  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const provider = formData.get("provider")?.toString();

  const validProviders = ["google"];

  // --- LOGIN CON OAUTH (GOOGLE) ---
  if (provider && validProviders.includes(provider)) {
    console.log("[signin] Iniciando OAuth con Google...");

    const redirectTo =
      "https://dashboard.sotomayorconsulting.com/api/auth/callback";

    console.log("[signin] redirectTo:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo,
      },
    });

    console.log("[signin] Resultado signInWithOAuth -> error:", error);
    console.log("[signin] Resultado signInWithOAuth -> data.url:", data?.url);

    if (error) {
      console.error("[signin] Error OAuth:", error);
      return redirectWithMessage(
        redirect,
        "No se pudo iniciar sesión con Google. Intenta de nuevo.",
      );
    }

    // Redirigimos a la URL de Supabase/Google
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

  console.log("[signin] Resultado signInWithPassword -> error:", error);
  console.log(
    "[signin] Resultado signInWithPassword -> data.session existe?:",
    !!data?.session,
  );

  if (error || !data?.session) {
    console.error("[signin] Error login email/password:", error);
    return redirectWithMessage(
      redirect,
      "Correo o contraseña incorrectos. Revisa tus datos e inténtalo nuevamente.",
    );
  }

  const { access_token, refresh_token } = data.session;

  // Tus cookies custom, como antes
  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });

  return redirectWithMessage(
    redirect,
    "Sesión iniciada correctamente.",
    "success",
  );
};
