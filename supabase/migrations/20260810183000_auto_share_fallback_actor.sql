-- Corrige un NOT NULL violation en el auto-share.
--
-- documents.document_shares.shared_by_user_id es NOT NULL, pero
-- share_document_with_case_owner lo derivaba de
-- coalesce(documents.updated_by, documents.uploaded_by) — ambas columnas son
-- NULLABLE. Un documento sin autor (importado vía REST/PostgREST, p. ej. n8n)
-- hacía fallar el INSERT y, con él, la operación que disparó el trigger.
--
-- El bug venía de la función original (auto_share_on_client_visible); la
-- reescritura a document_links lo dejó al descubierto porque ahora el
-- disparo ocurre también al crear el link.
--
-- Fallback: atribuir el share al propio dueño del caso. Es el reparto que ya
-- se está concediendo, así que la atribución es veraz y el evento de
-- auditoría real sigue viviendo en document_events.

create or replace function documents.share_document_with_case_owner(
	p_document_id uuid
)
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
		-- v_owner_id como último recurso: la columna es NOT NULL y el
		-- documento puede no tener autor conocido.
		coalesce(v_document.updated_by, v_document.uploaded_by, v_owner_id),
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

revoke execute on function documents.share_document_with_case_owner(uuid)
	from public, anon, authenticated;
