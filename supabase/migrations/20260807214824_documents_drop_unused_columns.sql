-- content_hash e is_sensitive: sin referencias en todo src/ (ni se escriben
-- ni se leen) — columnas muertas, sin triggers/policies dependientes.
--
-- visibility NO se toca en esta migración: a diferencia de lo que parecía
-- desde el código de la app, tiene un trigger real dependiendo de ella
-- (documents.auto_share_on_client_visible, dispara al pasar a
-- 'client_visible') y 3 RLS policies (documents_select_access,
-- document_links_select_access, document_approvals_select_access) que la
-- usan como parte de la autorización real a nivel de Postgres, no solo
-- como filtro de conveniencia en la app. Requiere decidir primero si algo
-- externo (import vía n8n/PostgREST) depende de setear visibility
-- directamente para que el trigger comparta con el dueño del caso.
alter table documents.documents
	drop column content_hash,
	drop column is_sensitive;
