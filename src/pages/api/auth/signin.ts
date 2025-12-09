// src/pages/api/auth/login.ts (o como se llame)
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";

// helpercito para no repetir código
function redirectWithMessage(
  redirectFn: (path: string, status?: 301 | 302 | 303 | 307 | 308 | 300 | 304 | undefined) => Response,
  msg: string,
  statusType: "success" | "error" = "error",
) {
  const params = new URLSearchParams({
    status: statusType,
    msg,
  });

  // /sign-in?status=error&msg=...
  return redirectFn(`/sign-in?${params.toString()}`);
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const provider = formData.get("provider")?.toString();

  const validProviders = ["google"];

  // --- LOGIN CON OAUTH (GOOGLE) ---
  if (provider && validProviders.includes(provider)) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo:
          "https://dashboard.sotomayorconsulting.com/api/auth/callback",
      },
    });

    if (error) {
      console.error("Error OAuth:", error);
      // mensaje amigable, no el mensaje crudo de Supabase
      return redirectWithMessage(
        redirect,
        "No se pudo iniciar sesión con Google. Intenta de nuevo.",
      );
    }

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
    console.error("Error login email/password:", error);

    // Puedes usar error.message, o poner algo más genérico:
    // return redirectWithMessage(redirect, error.message);
    return redirectWithMessage(
      redirect,
      "Correo o contraseña incorrectos. Revisa tus datos e inténtalo nuevamente.",
    );
  }

  const { access_token, refresh_token } = data.session;

  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });

  return redirectWithMessage(redirect, "Sesión iniciada correctamente.", "success");
};
