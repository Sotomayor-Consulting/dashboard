// src/lib/supabase/index.ts
// ─── Barrel exports de clientes Supabase ────────────────
//
// Tres clientes con propósitos diferentes:
//
// 1. createSupabaseServerClient → SSR (per-request, con cookies) — PREFERIDO
// 2. supabaseAdmin              → Service role (singleton, solo server)
// 3. supabaseBrowser            → Client-side (singleton, para <script> tags)
//
// DEPRECATED: `supabase` (singleton sin cookies). Migrar a createSupabaseServerClient.

export { createSupabaseServerClient } from './server';
export { supabaseAdmin } from './admin';
export { supabaseBrowser } from './browser';

/**
 * @deprecated Usa `createSupabaseServerClient` en su lugar.
 * Este singleton NO tiene contexto de cookies y no funciona correctamente en SSR.
 */
export { supabase } from './client';
