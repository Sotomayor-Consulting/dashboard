-- Revisión completa de RLS y privilegios del schema `documents`.
--
-- Contexto: `documents` está expuesto en PostgREST, así que cada tabla es
-- alcanzable con una clave anon/authenticated. La app escribe casi siempre con
-- service_role (que ignora RLS), de modo que estas policies son la defensa
-- real contra el acceso directo a la API, no un filtro de conveniencia.
--
-- Modelo de acceso unificado:
--
--   staff (admin | operaciones)  → todo
--   cliente                      → un documento si lo subió él o si tiene un
--                                  share activo; y todo lo que cuelga de ese
--                                  documento (links, eventos)
--   solicitudes                  → el dueño de la incorporación
--   catálogo de tipos            → cualquier autenticado
--   plantillas                   → solo staff (lectura), solo admin (escritura)
--   anon                         → nada
--
-- Problemas corregidos (ver detalle en cada bloque):
--   1. Dos funciones de staff distintas usadas de forma inconsistente.
--   2. Plantillas legibles por `anon`.
--   3. GRANT ALL (incl. INSERT/UPDATE/DELETE/TRUNCATE) a anon y authenticated
--      en todas las tablas: la RLS era lo único que frenaba las escrituras.
--   4. Privilegios por defecto que reproducen el problema en cada tabla nueva.
--   5. EXECUTE para anon sobre una función SECURITY DEFINER.
--   6. document_links_self_or_staff: fuga de metadatos al dueño del caso.
--   7. document_events visible por actor en vez de por documento.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. Un único chequeo de staff.
--
--    Convivían dos: documents.is_staff() (lee el claim `user_roles` del JWT)
--    y public.is_workflow_staff() (consulta la tabla). Cubren los mismos roles
--    pero fallan distinto: un JWT sin el claim deja fuera al staff. Se
--    consolidan delegando en la versión de tabla, que es SECURITY DEFINER.
--    A partir de aquí, todas las policies llaman solo a documents.is_staff().
-- ─────────────────────────────────────────────────────────────
create or replace function documents.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
	select coalesce(
		(auth.jwt() -> 'user_roles') ?| array['admin', 'operaciones'],
		false
	) or public.is_workflow_staff((select auth.uid()));
$$;

comment on function documents.is_staff() is
	'True si el usuario actual es admin u operaciones. Comprueba primero el '
	'claim user_roles del JWT y cae a public.is_workflow_staff (tabla) para '
	'no depender de que el token traiga el claim.';

-- ─────────────────────────────────────────────────────────────
-- 2. documents — la tabla raíz del modelo de acceso.
-- ─────────────────────────────────────────────────────────────
drop policy if exists documents_select_access on documents.documents;

create policy documents_select_access on documents.documents
for select to authenticated
using (
	documents.is_staff()
	or uploaded_by = (select auth.uid())
	or exists (
		select 1
		from documents.document_shares ds
		where ds.document_id = documents.id
			and ds.shared_with_user_id = (select auth.uid())
			and ds.share_status = 'active'
	)
);

-- ─────────────────────────────────────────────────────────────
-- 3. document_links — se hereda del documento.
--
--    document_links_self_or_staff concedía la fila a cualquier dueño de caso,
--    sin mirar shares: permitía enumerar qué documentos cuelgan de su
--    incorporación aunque no tuviera acceso a ninguno. Es el mismo agujero
--    que ya se cerró en documents.documents.
-- ─────────────────────────────────────────────────────────────
drop policy if exists document_links_self_or_staff on documents.document_links;
drop policy if exists document_links_select_access on documents.document_links;

create policy document_links_select_access on documents.document_links
for select to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from documents.documents d
		where d.id = document_links.document_id
			and (
				d.uploaded_by = (select auth.uid())
				or exists (
					select 1
					from documents.document_shares ds
					where ds.document_id = d.id
						and ds.shared_with_user_id = (select auth.uid())
						and ds.share_status = 'active'
				)
			)
	)
);

-- ─────────────────────────────────────────────────────────────
-- 4. document_events — se hereda del documento, no del actor.
--
--    Antes: actor_user_id = auth.uid(). Eso mostraba al cliente los eventos
--    que él generó incluso sobre documentos a los que ya no accede, y en
--    cambio le ocultaba el historial de los documentos que sí tiene
--    compartidos. Se alinea con el acceso al documento.
-- ─────────────────────────────────────────────────────────────
drop policy if exists document_events_select_actor on documents.document_events;
drop policy if exists document_events_select_access on documents.document_events;

create policy document_events_select_access on documents.document_events
for select to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from documents.documents d
		where d.id = document_events.document_id
			and (
				d.uploaded_by = (select auth.uid())
				or exists (
					select 1
					from documents.document_shares ds
					where ds.document_id = d.id
						and ds.shared_with_user_id = (select auth.uid())
						and ds.share_status = 'active'
				)
			)
	)
);

-- ─────────────────────────────────────────────────────────────
-- 5. document_shares — el usuario ve los repartos que le atañen.
-- ─────────────────────────────────────────────────────────────
drop policy if exists document_shares_select_self_or_uploader
	on documents.document_shares;
drop policy if exists document_shares_select_access on documents.document_shares;

create policy document_shares_select_access on documents.document_shares
for select to authenticated
using (
	documents.is_staff()
	or shared_with_user_id = (select auth.uid())
	or shared_by_user_id = (select auth.uid())
);

-- ─────────────────────────────────────────────────────────────
-- 6. document_requests / document_request_links — por dueño del caso.
--    Aquí case_id sí es un hecho propio de la solicitud, no una copia.
-- ─────────────────────────────────────────────────────────────
drop policy if exists document_requests_select_access on documents.document_requests;

create policy document_requests_select_access on documents.document_requests
for select to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from public.incorporations i
		where i.id = document_requests.case_id
			and i.user_id = (select auth.uid())
	)
);

drop policy if exists document_request_links_select_access
	on documents.document_request_links;

create policy document_request_links_select_access
on documents.document_request_links
for select to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from documents.document_requests dr
		join public.incorporations i on i.id = dr.case_id
		where dr.id = document_request_links.document_request_id
			and i.user_id = (select auth.uid())
	)
);

-- ─────────────────────────────────────────────────────────────
-- 7. document_types — catálogo, legible por cualquier autenticado.
-- ─────────────────────────────────────────────────────────────
drop policy if exists document_types_read_all on documents.document_types;

create policy document_types_read_all on documents.document_types
for select to authenticated
using (true);

-- ─────────────────────────────────────────────────────────────
-- 8. document_templates — herramienta interna.
--
--    document_templates_read_active estaba concedida a PUBLIC con
--    `is_active and deleted_at is null`, y anon tiene GRANT SELECT: cualquiera
--    con la clave anónima podía leer nombre, descripción, field_definitions,
--    field_mapping, transformer_id y source_url de todas las plantillas
--    activas. Pasa a ser solo staff.
--
--    La escritura la hacen los admin con su propio JWT desde el
--    template-manager (domains/templates/templates.ts usa el cliente de
--    sesión), así que la policy de ALL se conserva, ya acotada a authenticated.
-- ─────────────────────────────────────────────────────────────
drop policy if exists document_templates_read_active on documents.document_templates;
drop policy if exists document_templates_admin_all on documents.document_templates;

create policy document_templates_select_staff on documents.document_templates
for select to authenticated
using (documents.is_staff());

create policy document_templates_admin_write on documents.document_templates
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 9. Privilegios de tabla: mínimo necesario.
--
--    Todas las tablas tenían GRANT ALL (incluido INSERT/UPDATE/DELETE/
--    TRUNCATE) para anon y authenticated. Que no se pudiera escribir dependía
--    únicamente de la ausencia de policies de escritura — una policy nueva mal
--    puesta habría abierto la escritura sin que nadie lo notara.
-- ─────────────────────────────────────────────────────────────
revoke all on all tables in schema documents from anon;
revoke all on all tables in schema documents from authenticated;
revoke usage on schema documents from anon;

grant select on all tables in schema documents to authenticated;

-- Única excepción: los admin gestionan plantillas con su propio JWT.
grant insert, update, delete on documents.document_templates to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 10. Privilegios por defecto: que una tabla nueva no nazca abierta.
-- ─────────────────────────────────────────────────────────────
alter default privileges for role postgres in schema documents
	revoke all on tables from anon;
alter default privileges for role postgres in schema documents
	revoke all on tables from authenticated;
alter default privileges for role postgres in schema documents
	grant select on tables to authenticated;

alter default privileges for role postgres in schema documents
	revoke all on functions from anon;
alter default privileges for role postgres in schema documents
	revoke all on sequences from anon;

-- ─────────────────────────────────────────────────────────────
-- 11. Funciones SECURITY DEFINER: nunca para anon.
--
--    documents.resolve_case_id ignora RLS por diseño (lo necesita la policy de
--    documents.documents). Los privilegios por defecto del schema le habían
--    dado EXECUTE a anon, lo que permitía resolver la incorporación de
--    cualquier documento con solo la clave anónima.
-- ─────────────────────────────────────────────────────────────
revoke all on function documents.resolve_case_id(uuid) from public, anon;
grant execute on function documents.resolve_case_id(uuid) to authenticated;
grant execute on function documents.resolve_case_id(uuid) to service_role;

commit;
