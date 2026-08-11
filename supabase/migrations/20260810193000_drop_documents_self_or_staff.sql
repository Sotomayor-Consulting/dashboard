-- Elimina documents.documents.documents_self_or_staff.
--
-- La policy concedía SELECT al dueño de la incorporación sobre TODOS los
-- documentos de su caso, sin mirar shares:
--
--   exists (select 1 from incorporations e
--           where e.id = <case del documento> and e.user_id = auth.uid())
--
-- Nunca miró `visibility` tampoco, así que los documentos internos ya eran
-- legibles por el cliente vía PostgREST directo (3 filas en dev al aplicar
-- esta migración). Con `visibility` fuera, es lo único que impide que la
-- regla del modelo sea cierta de punta a punta:
--
--     un cliente ve un documento  <=>  tiene un share activo,
--                                      o él mismo lo subió
--
-- El acceso legítimo del cliente queda cubierto por las otras dos ramas de
-- documents_select_access (uploaded_by y el share activo).

begin;

-- La rama de staff de la policy que se elimina usaba public.is_workflow_staff
-- (consulta user_roles en tabla), mientras que documents_select_access usa
-- documents.is_staff() (lee el claim user_roles del JWT). Cubren los mismos
-- roles —admin y operaciones— pero por vías distintas: un JWT emitido sin el
-- claim dejaría fuera al staff. Se conservan ambas comprobaciones, ya
-- consolidadas en la única policy que queda.
drop policy if exists documents_select_access on documents.documents;

create policy documents_select_access on documents.documents
for select to authenticated
using (
	documents.is_staff()
	or public.is_workflow_staff((select auth.uid()))
	or uploaded_by = (select auth.uid())
	or exists (
		select 1
		from documents.document_shares ds
		where ds.document_id = documents.id
			and ds.shared_with_user_id = (select auth.uid())
			and ds.share_status = 'active'
	)
);

drop policy if exists documents_self_or_staff on documents.documents;

commit;
