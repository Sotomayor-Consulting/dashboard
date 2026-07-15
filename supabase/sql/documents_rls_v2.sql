-- Documents RLS v2 — reemplaza el baseline incompleto de documents_rls.sql.
-- Motivo: las políticas originales solo cubrían documentos enlazados como
-- related_to_type = 'incorporation_case' vía ownership directo. La mayoría
-- de los documentos reales se enlazan como related_to_type = 'company', y
-- la app (domains/documents/document_dashboard.ts, service.ts) autoriza
-- lectura no-staff por visibilidad ('client_visible') + document_shares
-- activo, no por ownership plano. Esta versión alinea las policies con esa
-- misma regla, usando documents.documents.case_id (FK directa a
-- public.incorporations, siempre presente sin importar el
-- related_to_type del link) en vez de repetir el join por cada tipo.
--
-- Notas:
-- - Las rutas de la app (API routes, servicios SSR) siempre usan
--   supabaseAdmin (service role), que bypassea RLS; estas policies son
--   defensa en profundidad para cualquier acceso vía cliente RLS-scoped.
-- - No se agregan policies de INSERT/UPDATE/DELETE: todas las escrituras
--   pasan por supabaseAdmin en src/domains/documents/service.ts.
-- - Ejecutar en el SQL editor de Supabase.

begin;

-- ---------------------------------------------------------------------------
-- Helper: ¿el usuario autenticado es staff (admin/operaciones)?
-- Lee el claim `user_roles` inyectado por public.custom_access_token_hook.
-- ---------------------------------------------------------------------------
create or replace function documents.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
	select coalesce(
		(auth.jwt() -> 'user_roles') ?| array['admin', 'operaciones'],
		false
	);
$$;

-- ---------------------------------------------------------------------------
-- documents.documents
-- ---------------------------------------------------------------------------
drop policy if exists documents_select_own_incorp_case on documents.documents;
drop policy if exists documents_insert_own_incorp_case on documents.documents;
drop policy if exists documents_select_access on documents.documents;

-- El propio uploader siempre ve lo que subió (p. ej. al responder una
-- solicitud de documento como cliente), sin depender de un share activo:
-- el auto-share al subir solo lo dispara staff (ver uploadDocument en
-- src/domains/documents/service.ts). Sin esta excepción el cliente nunca
-- vería sus propias cargas — bug real detectado en producción.
create policy documents_select_access
on documents.documents
for select
to authenticated
using (
	documents.is_staff()
	or uploaded_by = auth.uid()
	or (
		visibility = 'client_visible'
		and exists (
			select 1
			from documents.document_shares ds
			where ds.document_id = documents.id
				and ds.shared_with_user_id = auth.uid()
				and ds.share_status = 'active'
		)
	)
);

-- ---------------------------------------------------------------------------
-- documents.document_links — visible si el documento asociado es visible
-- (staff, uploader, o client_visible + share activo), sin importar
-- related_to_type.
-- ---------------------------------------------------------------------------
drop policy if exists document_links_select_own_incorp_case on documents.document_links;
drop policy if exists document_links_insert_own_incorp_case on documents.document_links;
drop policy if exists document_links_select_access on documents.document_links;

create policy document_links_select_access
on documents.document_links
for select
to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from documents.documents d
		where d.id = document_links.document_id
			and (
				d.uploaded_by = auth.uid()
				or (
					d.visibility = 'client_visible'
					and exists (
						select 1
						from documents.document_shares ds
						where ds.document_id = d.id
							and ds.shared_with_user_id = auth.uid()
							and ds.share_status = 'active'
					)
				)
			)
	)
);

-- ---------------------------------------------------------------------------
-- documents.document_requests — visible para staff o el dueño del caso
-- (independiente de shares; una solicitud avisa qué debe subir el cliente).
-- ---------------------------------------------------------------------------
drop policy if exists document_requests_select_own_incorp_case on documents.document_requests;
drop policy if exists document_requests_select_access on documents.document_requests;

create policy document_requests_select_access
on documents.document_requests
for select
to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from public.incorporations i
		where i.id = document_requests.case_id
			and i.user_id = auth.uid()
	)
);

-- ---------------------------------------------------------------------------
-- documents.document_request_links — visible si la solicitud asociada lo es.
-- ---------------------------------------------------------------------------
drop policy if exists document_request_links_select_own_incorp_case on documents.document_request_links;
drop policy if exists document_request_links_select_access on documents.document_request_links;

create policy document_request_links_select_access
on documents.document_request_links
for select
to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from documents.document_requests dr
		join public.incorporations i on i.id = dr.case_id
		where dr.id = document_request_links.document_request_id
			and i.user_id = auth.uid()
	)
);

-- ---------------------------------------------------------------------------
-- documents.document_approvals — visible si el documento asociado lo es.
-- ---------------------------------------------------------------------------
drop policy if exists document_approvals_select_if_document_readable on documents.document_approvals;
drop policy if exists document_approvals_select_access on documents.document_approvals;

create policy document_approvals_select_access
on documents.document_approvals
for select
to authenticated
using (
	documents.is_staff()
	or exists (
		select 1
		from documents.documents d
		where d.id = document_approvals.document_id
			and (
				d.uploaded_by = auth.uid()
				or (
					d.visibility = 'client_visible'
					and exists (
						select 1
						from documents.document_shares ds
						where ds.document_id = d.id
							and ds.shared_with_user_id = auth.uid()
							and ds.share_status = 'active'
					)
				)
			)
	)
);

-- ---------------------------------------------------------------------------
-- documents.document_shares — self-service (definido en documents_sharing.sql)
-- + acceso staff para consistencia con el resto del schema.
-- ---------------------------------------------------------------------------
drop policy if exists document_shares_select_self_or_uploader on documents.document_shares;

create policy document_shares_select_self_or_uploader
on documents.document_shares
for select
to authenticated
using (
	documents.is_staff()
	or shared_with_user_id = auth.uid()
	or shared_by_user_id = auth.uid()
);

commit;
