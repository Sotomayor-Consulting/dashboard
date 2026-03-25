// ─── Barrel exports de clientes Supabase ────────────────
//
// Tres clientes con propósitos diferentes:
//
// 1. createSupabaseServerClient → SSR (per-request, con cookies) — PREFERIDO
// 2. supabaseBrowser            → Client-side (singleton, para <script> tags)
//
// Nota: supabaseAdmin se importa directo desde "@lib/supabase/admin"
// para evitar side effects al importar este barrel en rutas SSR.

export { createSupabaseServerClient } from './server';
export { supabaseBrowser } from './browser';
