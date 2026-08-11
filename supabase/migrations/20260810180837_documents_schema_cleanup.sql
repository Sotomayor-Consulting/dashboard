-- Depuración del schema `documents` (DRY / KISS / YAGNI).
--
-- Continúa la limpieza iniciada en 20260807211154..20260807214824
-- (`content_hash` e `is_sensitive` ya se eliminaron ahí; no se repiten).
--
-- Resumen:
--   · Elimina `document_approvals` — tabla write-only, duplicaba document_events.
--   · Sustituye el soft-delete por archivado vía el enum de estado.
--   · Quita columnas sin lectura en shares / requests / links.
--   · Elimina `case_id` de documents, shares y events: document_links es la
--     única fuente de verdad de la relación documento → incorporación.
--
-- NO toca `visibility` ni las 3 RLS policies que dependen de ella: esa
-- decisión sigue pendiente de confirmar si algún import externo (n8n) la
-- escribe directamente (ver supabase/docs/documents-table-audit.md §6).

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. document_approvals: tabla write-only.
--    Solo se inserta (service.ts, updateDocumentReviewStatus) y jamás se lee.
--    `document_events` ya registra el mismo hecho con event_type
--    'approved'/'rejected', actor, from_status/to_status y los comentarios
--    en `metadata`.
--
--    Efecto colateral útil: se va con ella la policy
--    document_approvals_select_access, una de las 3 dependencias de
--    `visibility` que bloquean su eliminación futura.
-- ─────────────────────────────────────────────────────────────
drop table if exists documents.document_approvals;
drop type if exists documents.document_approval_role;
drop type if exists documents.document_approval_status;

-- ─────────────────────────────────────────────────────────────
-- 2. Soft-delete → archivado.
--    documents.document_status ya incluye 'archived' y el front ya lo pinta
--    (src/modules/documents/document-ui.ts). En dev no hay filas con
--    deleted_at, pero los UPDATE quedan por si prod difiere.
-- ─────────────────────────────────────────────────────────────
update documents.documents
set status = 'archived'
where deleted_at is not null
	and status <> 'archived';

alter table documents.documents
	drop column if exists deleted_at,
	drop column if exists deleted_by;

-- Para las solicitudes el equivalente semántico es 'cancelled'.
update documents.document_requests
set status = 'cancelled'
where deleted_at is not null
	and status <> 'cancelled';

alter table documents.document_requests
	drop column if exists deleted_at,
	drop column if exists deleted_by;

drop index if exists documents.idx_document_requests_active_case_status;

-- ─────────────────────────────────────────────────────────────
-- 3. document_shares: auditoría muerta y denormalización.
--    - revoked_at / revoked_by_user_id: nunca se escriben. revokeDocumentShare
--      solo actualiza share_status; el quién/cuándo ya vive en document_events
--      (event_type='share_revoked').
--    - expires_at / notes: nunca se escriben ni se leen.
--    - case_id: derivable del documento (ver paso 7).
-- ─────────────────────────────────────────────────────────────
drop index if exists documents.idx_document_shares_case_user_status;
drop index if exists documents.idx_document_shares_case;

-- Se solapa con uq_document_shares_document_user + el índice parcial de
-- 'active'; no aporta nada.
drop index if exists documents.idx_document_shares_document_user_status;

alter table documents.document_shares
	drop column if exists revoked_at,
	drop column if exists revoked_by_user_id,
	drop column if exists expires_at,
	drop column if exists notes,
	drop column if exists case_id;

-- ─────────────────────────────────────────────────────────────
-- 4. document_events.case_id: copia derivable del documento.
-- ─────────────────────────────────────────────────────────────
drop index if exists documents.idx_document_events_case;

-- La vista depende de la columna: se tira y se recrea sin ella.
drop view if exists documents.document_events_with_actors;

alter table documents.document_events
	drop column if exists case_id;

create view documents.document_events_with_actors
with (security_invoker = true) as
select
	de.id,
	de.document_id,
	de.event_type,
	de.from_status,
	de.to_status,
	de.actor_user_id,
	de.actor_role,
	de.notes,
	de.metadata,
	de.created_at,
	nullif(
		trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')),
		''
	) as actor_name
from documents.document_events de
left join public.usuarios u on u.user_id = de.actor_user_id;

comment on view documents.document_events_with_actors is
	'Document events enriched with the actor''s display name from public.usuarios. '
	'Timestamps are timestamptz (UTC); format in the client using Intl.DateTimeFormat '
	'to respect the user''s local timezone.';

-- ─────────────────────────────────────────────────────────────
-- 5. is_primary en las tablas de links: se escribe siempre `true` y nunca se
--    lee. El discriminante real es relation_purpose, que sí se consulta
--    ('owner', 'signature'). El UNIQUE de la tupla ya garantiza unicidad.
-- ─────────────────────────────────────────────────────────────
alter table documents.document_links
	drop column if exists is_primary;

alter table documents.document_request_links
	drop column if exists is_primary;

-- ─────────────────────────────────────────────────────────────
-- 6. document_requests.reminder_count: contador sin uso; no hay job de
--    recordatorios que lo incremente ni lectura que lo muestre.
-- ─────────────────────────────────────────────────────────────
alter table documents.document_requests
	drop column if exists reminder_count;

-- ─────────────────────────────────────────────────────────────
-- 7. documents.case_id: la última denormalización.
--
--    `resolveCaseIdForDocument` (service.ts) ya reconstruye el caso desde
--    document_links y "autorrepara" la columna sobre la marcha — el sistema
--    ya trata document_links como fuente de verdad y la columna como una
--    caché que se desincroniza. La ruta de lectura principal
--    (getDocumentsForRelated) arranca FROM document_links y nunca la lee.
-- ─────────────────────────────────────────────────────────────

-- 7a. Backfill: documentos con case_id que no llegan al caso por ningún
--     link (26 filas en dev) perderían la relación. Se materializan.
insert into documents.document_links (
	document_id, related_to_type, related_to_id, relation_purpose, created_by
)
select d.id, 'incorporation_case', d.case_id, 'owner', d.created_by
from documents.documents d
where d.case_id is not null
	and not exists (
		select 1 from documents.document_links dl
		where dl.document_id = d.id
			and dl.related_to_type = 'incorporation_case'
			and dl.related_to_id = d.case_id
	)
	and not exists (
		select 1
		from documents.document_links dl
		join public.companies c on c.id = dl.related_to_id
		where dl.document_id = d.id
			and dl.related_to_type = 'company'
			and c.incorporation_id = d.case_id
	)
on conflict (document_id, related_to_type, related_to_id, relation_purpose)
	do nothing;

-- 7b. Resolución canónica documento → incorporación. Reemplaza a
--     resolveCaseIdForDocument (JS) y cubre las dos rutas: link directo al
--     caso, o link a la empresa.
--
--     SECURITY DEFINER a propósito: se invoca desde la RLS policy de
--     documents.documents. Si leyera document_links con la RLS del usuario,
--     habría recursión mutua (document_links_select_access consulta
--     documents.documents).
create function documents.resolve_case_id(p_document_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
	select dl.related_to_id
	from documents.document_links dl
	where dl.document_id = p_document_id
		and dl.related_to_type = 'incorporation_case'
	union all
	select c.incorporation_id
	from documents.document_links dl
	join public.companies c on c.id = dl.related_to_id
	where dl.document_id = p_document_id
		and dl.related_to_type = 'company'
		and c.incorporation_id is not null
	limit 1;
$$;

comment on function documents.resolve_case_id(uuid) is
	'Resuelve la incorporación de un documento vía document_links. '
	'Reemplaza la columna denormalizada documents.documents.case_id.';

grant execute on function documents.resolve_case_id(uuid) to authenticated;
grant execute on function documents.resolve_case_id(uuid) to service_role;

-- 7c. Misma resolución en forma de conjunto, para joins desde la app.
--     security_invoker: cada usuario ve solo los links que su RLS permite.
create view documents.document_case_map
with (security_invoker = true) as
select dl.document_id, dl.related_to_id as case_id
from documents.document_links dl
where dl.related_to_type = 'incorporation_case'
union
select dl.document_id, c.incorporation_id as case_id
from documents.document_links dl
join public.companies c on c.id = dl.related_to_id
where dl.related_to_type = 'company'
	and c.incorporation_id is not null;

comment on view documents.document_case_map is
	'Mapa documento → incorporación derivado de document_links.';

-- 7d. La policy documents_self_or_staff depende de case_id: se reescribe
--     con la función antes de poder eliminar la columna. Semántica
--     preservada exactamente (el dueño del caso ve los documentos de su
--     incorporación; el staff de workflow ve todo).
drop policy if exists documents_self_or_staff on documents.documents;

create policy documents_self_or_staff on documents.documents
for select to authenticated
using (
	public.is_workflow_staff((select auth.uid()))
	or exists (
		select 1
		from public.incorporations e
		where e.id = documents.resolve_case_id(documents.id)
			and e.user_id = (select auth.uid())
	)
);

-- 7e. Fuera la columna y sus índices.
drop index if exists documents.idx_documents_case_id;
drop index if exists documents.idx_documents_case_visibility;
drop index if exists documents.idx_documents_case_status;

alter table documents.documents
	drop column if exists case_id;

-- 7f. El auto-share leía documents.case_id en un AFTER INSERT, pero el
--     document_links se inserta DESPUÉS del documento: en el momento del
--     disparo el caso todavía no era conocible. Ahora hay dos disparadores
--     sobre un único cuerpo.
drop trigger if exists trg_documents_auto_share_client_visible
	on documents.documents;
drop function if exists documents.auto_share_on_client_visible();

create function documents.share_document_with_case_owner(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_document record;
	v_case_id uuid;
	v_owner_id uuid;
begin
	select id, visibility, updated_by, uploaded_by
	into v_document
	from documents.documents
	where id = p_document_id;

	if not found or v_document.visibility <> 'client_visible' then
		return;
	end if;

	v_case_id := documents.resolve_case_id(p_document_id);
	if v_case_id is null then
		return;
	end if;

	select user_id into v_owner_id
	from public.incorporations
	where id = v_case_id;

	if v_owner_id is null then
		return;
	end if;

	insert into documents.document_shares (
		document_id,
		shared_with_user_id,
		shared_by_user_id,
		share_status,
		shared_at,
		updated_at
	) values (
		p_document_id,
		v_owner_id,
		coalesce(v_document.updated_by, v_document.uploaded_by),
		'active',
		now(),
		now()
	)
	on conflict (document_id, shared_with_user_id)
	do update set
		share_status = 'active',
		shared_at = now(),
		updated_at = now()
	where documents.document_shares.share_status <> 'active';
end;
$$;

-- Disparador A: se crea el link → el caso pasa a ser conocible.
create function documents.trg_link_auto_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	perform documents.share_document_with_case_owner(new.document_id);
	return new;
end;
$$;

create trigger trg_document_links_auto_share
after insert on documents.document_links
for each row
execute function documents.trg_link_auto_share();

-- Disparador B: un documento ya enlazado pasa a client_visible.
create function documents.trg_visibility_auto_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	if new.visibility = 'client_visible'
		and (tg_op = 'INSERT' or old.visibility <> 'client_visible')
	then
		perform documents.share_document_with_case_owner(new.id);
	end if;

	return new;
end;
$$;

create trigger trg_documents_auto_share_visibility
after insert or update of visibility on documents.documents
for each row
execute function documents.trg_visibility_auto_share();

revoke execute on function documents.share_document_with_case_owner(uuid)
	from public, anon, authenticated;
revoke execute on function documents.trg_link_auto_share()
	from public, anon, authenticated;
revoke execute on function documents.trg_visibility_auto_share()
	from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. Integridad: un objeto del bucket no puede tener dos filas vivas.
--
--    En dev hay 3 grupos duplicados (11 filas), todos reintentos de subida
--    del mismo archivo. Se archivan las copias viejas — no se borran, en
--    línea con el paso 2 — y el índice único aplica solo a lo no archivado.
-- ─────────────────────────────────────────────────────────────
with ranked as (
	select id, row_number() over (
		partition by bucket_storage, bucket_path
		order by created_at desc, id
	) as rn
	from documents.documents
	where status <> 'archived'
)
update documents.documents d
set status = 'archived'
from ranked r
where d.id = r.id
	and r.rn > 1;

create unique index if not exists uq_documents_live_bucket_object
	on documents.documents (bucket_storage, bucket_path)
	where status <> 'archived';

-- ─────────────────────────────────────────────────────────────
-- 9. Índice para los listados no archivados (reemplaza los filtros
--    `.is('deleted_at', null)`, que en código pasan a
--    `.neq('status', 'archived')`).
--
--    Las consultas por caso ahora entran por document_links, que ya tiene
--    idx_document_links_related (related_to_type, related_to_id).
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_documents_active_status
	on documents.documents (status)
	where status <> 'archived';

commit;
