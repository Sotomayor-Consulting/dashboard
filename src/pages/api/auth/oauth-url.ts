import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { provider } = await request.json();
    
    console.log('🔄 oauth-url endpoint llamado - Sin cookies');

    const validProviders = ["google"];

    if (!provider || !validProviders.includes(provider)) {
      return new Response(JSON.stringify({ error: "Proveedor no válido" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log('🔐 Iniciando OAuth con Google...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: "https://dashboard-sotomayor-consulting.netlify.app/api/auth/callback_start",
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log('✅ URL de OAuth generada exitosamente');
    return new Response(JSON.stringify({ url: data.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('💥 Error en oauth-url:', error);
    return new Response(JSON.stringify({ 
      error: "Error interno del servidor"
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};