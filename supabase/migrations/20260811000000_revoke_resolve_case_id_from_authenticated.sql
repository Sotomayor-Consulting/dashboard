-- Retira EXECUTE de `documents.resolve_case_id` a `authenticated`.
--
-- La función es SECURITY DEFINER: ignora RLS por diseño. Se le concedió
-- EXECUTE a `authenticated` en 20260810180837 porque entonces la usaba la
-- policy `documents_self_or_staff` de documents.documents, y una policy no
-- puede invocar una función que el rol consultante no puede ejecutar.
--
-- Esa policy se eliminó en 20260810193000 y la que la sustituyó no la usa.
-- El grant quedó huérfano, y con él una fuga: cualquier usuario autenticado
-- podía llamar /rest/v1/rpc/resolve_case_id con un UUID arbitrario y obtener
-- la incorporación de cualquier documento, sin pasar por RLS.
--
-- Comprobado antes de revocar: ninguna policy, función ni vista la referencia.
-- Los únicos consumidores son domains/documents/service.ts y
-- api/documents/upload-signed.ts, ambos con supabaseAdmin (service_role).

begin;

revoke execute on function documents.resolve_case_id(uuid) from authenticated;

commit;
