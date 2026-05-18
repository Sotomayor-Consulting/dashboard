-- ─── Force logout: invalidar todas las sesiones de un usuario ─────
-- Se llama desde el endpoint que cambia roles (api/users/update.ts) para
-- que el próximo request del usuario afectado emita un JWT nuevo con los
-- roles actualizados (vía custom_access_token_hook).
--
-- auth.admin.signOut() de supabase-js acepta un JWT, no un user_id — por
-- eso necesitamos esta RPC.

create or replace function public.force_logout_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  delete from auth.sessions where user_id = target_user_id;
  delete from auth.refresh_tokens where user_id = target_user_id::text;
end;
$$;

revoke execute on function public.force_logout_user(uuid) from public, anon, authenticated;
grant  execute on function public.force_logout_user(uuid) to service_role;
