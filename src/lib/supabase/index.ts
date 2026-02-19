// Re-export all Supabase clients from a single entry point.
// `@lib/supabase` resolves here, maintaining backward compatibility.

export { supabase } from './client';
export { createSupabaseServerClient } from './server';
export { supabaseAdmin } from './admin';
export { supabaseBrowser } from './browser';
