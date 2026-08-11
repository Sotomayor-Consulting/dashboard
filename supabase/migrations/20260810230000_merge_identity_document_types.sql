-- Fusión de los dos tipos de identidad: 10 → 9 tipos.
--
--   national_id (id 10) ──► passport (id 4), renombrado a identity_document
--
-- Ambos acreditaban el mismo hecho —quién es el socio o manager— y obligaban
-- al checklist a expresar el requisito como "pasaporte O cédula". Un único
-- tipo lo resuelve.
--
-- CONTRAPARTIDA ASUMIDA
-- ---------------------
-- Se pierde saber cuál de los dos documentos aportó el cliente. Importa en el
-- paso de cuenta bancaria, donde el banco suele exigir pasaporte y no
-- cualquier identificación. Para que la distinción no desaparezca del todo,
-- aquí queda la lista de las filas que venían de `national_id`:
--
--   documents.documents
--     253f2f7e-730e-4968-85b0-c294cf0297c0
--     6db24d5f-07a7-4f74-ac75-4ff4d36e00fe
--     a557656f-8d3d-49fc-93cb-cdc5f852c7dc
--     acf00dc7-8dd2-4447-bc03-e25fa9597871
--
--   documents.document_requests
--     2ba82d96-0c62-4378-9d9c-e8f9eda44643
--     c5632df1-6995-4e0d-bc9c-466adf118b7a
--
-- Si más adelante hace falta distinguir el subtipo, el sitio natural es un
-- campo del propio documento (o el slot de carga), no dos entradas de
-- catálogo.
--
-- Solo dev. Producción sigue pendiente del bloque completo.

begin;

-- 1. Reasignar lo que apuntaba a national_id.
update documents.documents
set document_type_id = 4, updated_at = now()
where document_type_id = 10;

update documents.document_requests
set document_type_id = 4, updated_at = now()
where document_type_id = 10;

-- 2. El tipo superviviente deja de ser específico de pasaporte.
update documents.document_types
set slug = 'identity_document',
	name = 'Documento de Identidad',
	description =
		'Documento de identidad gubernamental del socio o manager: pasaporte, '
		'cédula o documento nacional equivalente.'
where id = 4;

-- 3. Fuera el duplicado.
delete from documents.document_types where id = 10;

commit;
