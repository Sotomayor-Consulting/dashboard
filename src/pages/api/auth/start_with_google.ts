import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const provider = formData.get("provider")?.toString();

  const validProviders = ["google"];

  if (provider && validProviders.includes(provider)) {
    // Copiar datos del negocio para el callback
    const businessData = cookies.get("business_data")?.value;
    
    if (businessData) {
      cookies.set("oauth_business_data", businessData, {
        path: "/",
        maxAge: 60 * 30,
        httpOnly: true,
        secure: import.meta.env.PROD
      });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: "/api/auth/callback_start",
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return redirect(data.url);
  }

  // Resto del código para login con email/password si es necesario
  return new Response("Método no válido", { status: 400 });
};