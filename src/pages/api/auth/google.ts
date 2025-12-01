// src/pages/api/auth/google.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

const BACK_PATH = "/start";

export const POST: APIRoute = async ({ redirect, url }) => {
  const back = url.searchParams.get("back") || BACK_PATH;

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${url.origin}/api/auth/callback_start?next=/`,
      },
    });

    if (error || !data.url) {
      const msg = encodeURIComponent(`Error iniciando OAuth: ${error?.message ?? "Desconocido"}`);
      return redirect(`${back}?status=error&msg=${msg}`);
    }

    return redirect(data.url);
  } catch (e: any) {
    const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
    return redirect(`${back}?status=error&msg=${msg}`);
  }
};