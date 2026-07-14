-- Auto-share al cliente cuando un documento pasa a visibility = 'client_visible'.
--
-- Motivo: el auto-share hoy vive solo en código de aplicación
-- (uploadDocument en src/domains/documents/service.ts), y ahí SOLO se
-- dispara cuando el actor es staff (actor.isStaff). Cualquier otra vía que
-- inserte o actualice documents.documents con visibility = 'client_visible'
-- (uploads directos como src/pages/api/partners/upload-contract.ts, futuros
-- scripts, migraciones de datos, etc.) deja el documento visible pero sin
-- fila en document_shares — el cliente no lo ve si no hay share activo. Este
-- trigger garantiza el share a nivel de base de datos, sin depender de que
-- cada código de escritura lo recuerde.
--
-- Alcance: comparte con el DUEÑO del caso (public.incorporations.user_id),
-- que es "el cliente" al que se refiere la regla. Compartir con un usuario
-- distinto (p. ej. un miembro puntual) se sigue haciendo vía
-- shareDocumentWithUser()/shareWithUserId, que queda intacto — este trigger
-- solo añade una garantía adicional, no reemplaza ese flujo.
--
-- Ejecutar en el SQL editor de Supabase.

create or replace function documents.auto_share_on_client_visible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_owner_id uuid;
begin
	if new.visibility <> 'client_visible' then
		return new;
	end if;

	-- Ya estaba client_visible antes de este UPDATE: no re-disparar en cada
	-- edición de metadata (evita resetear shared_at innecesariamente).
	if tg_op = 'UPDATE' and old.visibility = 'client_visible' then
		return new;
	end if;

	if new.case_id is null then
		return new;
	end if;

	select user_id into v_owner_id
	from public.incorporations
	where id = new.case_id;

	if v_owner_id is null then
		return new;
	end if;

	insert into documents.document_shares (
		document_id,
		case_id,
		shared_with_user_id,
		shared_by_user_id,
		share_status,
		shared_at,
		updated_at
	) values (
		new.id,
		new.case_id,
		v_owner_id,
		coalesce(new.updated_by, new.uploaded_by),
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

	return new;
end;
$$;

drop trigger if exists trg_documents_auto_share_client_visible on documents.documents;

create trigger trg_documents_auto_share_client_visible
after insert or update of visibility on documents.documents
for each row
execute function documents.auto_share_on_client_visible();

-- Es SECURITY DEFINER y solo debe ejecutarse como parte del trigger (bajo
-- privilegios del dueño de la tabla); no debe ser invocable directamente
-- como RPC de PostgREST por clientes (documents es un schema expuesto).
revoke execute on function documents.auto_share_on_client_visible() from public, anon, authenticated;
