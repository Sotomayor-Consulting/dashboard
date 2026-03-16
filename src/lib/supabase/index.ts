// ─── Barrel exports de clientes Supabase ────────────────
//
// Tres clientes con propósitos diferentes:
//
// 1. createSupabaseServerClient → SSR (per-request, con cookies) — PREFERIDO
// 2. supabaseAdmin              → Service role (singleton, solo server)
// 3. supabaseBrowser            → Client-side (singleton, para <script> tags)

export { createSupabaseServerClient } from './server';
export { supabaseAdmin } from './admin';
export { supabaseBrowser } from './browser';