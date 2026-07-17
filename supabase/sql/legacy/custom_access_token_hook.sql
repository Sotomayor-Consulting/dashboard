-- ─── Custom Access Token Hook: inyectar user_roles en el JWT ──────
-- Activar en Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → seleccionar
--   public.custom_access_token_hook
--
-- El hook se ejecuta cada vez que Supabase emite un access token (login,
-- signup, refresh). Lee user_roles → roles.name y los inyecta como
-- claim `user_roles` (array de strings). El middleware lee este claim
-- en lugar de hacer una query por request.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims     jsonb;
  user_roles jsonb;
begin
  -- Recoger los roles del usuario que está autenticándose.
  -- event->>'user_id' viene como string UUID.
  select coalesce(jsonb_agg(r.name), '[]'::jsonb)
  into user_roles
  from public.user_roles ur
  join public.roles r on r.id = ur.rol_id
  where ur.user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_roles}', user_roles);

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Permisos requeridos por Supabase Auth para invocar el hook.
grant execute on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;

-- Acceso de lectura a las tablas que el hook consulta.
grant select on table public.user_roles to supabase_auth_admin;
grant select on table public.roles      to supabase_auth_admin;

-- Bypass de RLS para el rol que ejecuta el hook (sin esto, las policies
-- harían que el SELECT retorne 0 filas y los roles vendrían vacíos).
create policy "Allow auth admin to read user_roles"
  on public.user_roles
  as permissive for select
  to supabase_auth_admin
  using (true);

create policy "Allow auth admin to read roles"
  on public.roles
  as permissive for select
  to supabase_auth_admin
  using (true);
