-- Elimina documents.documents.visibility.
--
-- La columna era redundante con la existencia de un share activo. Verificado
-- sobre los datos de dev antes de aplicar: 191 filas 'client_visible', todas
-- con share activo; 14 'internal_only', ninguna con share. Correlación total.
--
-- A partir de aquí el modelo tiene una sola regla:
--
--     un documento es visible para un cliente  <=>  existe un
--     documents.document_shares activo para ese usuario
--
-- (más las dos excepciones que ya existían: el staff ve todo, y quien subió
-- un documento siempre ve el suyo).
--
-- CONSECUENCIA ACEPTADA — imports externos
-- ----------------------------------------
-- El trigger de auto-share era el único mecanismo por el que un INSERT
-- directo vía REST/PostgREST (p. ej. n8n) con visibility='client_visible'
-- terminaba compartiendo el documento con el dueño del caso. Ese atajo
-- desaparece: cualquier proceso externo que deba dar acceso al cliente
-- tiene que insertar la fila en documents.document_shares.
--
-- Los triggers NO pueden conservarse sin la columna: sin el discriminante,
-- dispararían sobre todo documento enlazado y los 14 internos se filtrarían
-- al cliente.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. RLS: el share activo pasa a ser la única condición de acceso.
--    Semántica preservada salvo un borde inalcanzable hoy: un share activo
--    sobre un documento 'internal_only' ahora sí daría acceso. No existe
--    ninguna fila así (verificado arriba), y a partir de ahora crear el
--    share ES la forma deliberada de conceder acceso.
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
-- 2. Fuera el auto-share implícito. Todas las rutas de la app ya crean el
--    share explícitamente (uploadDocument con autoShare, y
--    shareDocumentWithUser); el trigger solo cubría los imports externos.
-- ─────────────────────────────────────────────────────────────
drop trigger if exists trg_document_links_auto_share on documents.document_links;
drop trigger if exists trg_documents_auto_share_visibility on documents.documents;

drop function if exists documents.trg_link_auto_share();
drop function if exists documents.trg_visibility_auto_share();
drop function if exists documents.share_document_with_case_owner(uuid);

-- ─────────────────────────────────────────────────────────────
-- 3. La columna y su enum.
-- ─────────────────────────────────────────────────────────────
alter table documents.documents
	drop column if exists visibility;

drop type if exists documents.document_visibility;

-- Nota: documents.document_event_type conserva el valor 'visibility_changed',
-- que queda sin uso. Eliminar un valor de un enum obliga a recrear el tipo y
-- reescribir la columna; no compensa por un valor histórico que además
-- describe eventos ya registrados.

commit;
