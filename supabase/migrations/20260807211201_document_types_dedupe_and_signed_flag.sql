-- Renombra para desambiguar del id 8 (mismo nombre, documento distinto).
update documents.document_types
	set name = 'Factura de Servicio Básico (Incorporación)'
	where id = 19;

-- id 2 duplica conceptualmente a id 23 (mismo documento, distinto
-- applies_to); id 23 sí tiene su firmado (id 37, que también se elimina
-- abajo). Reasigna cualquier fila existente antes de borrar el tipo (en
-- ambientes sin datos esto es un no-op).
update documents.documents set document_type_id = 23 where document_type_id = 2;
update documents.document_requests set document_type_id = 23 where document_type_id = 2;
delete from documents.document_types where id = 2;

-- Los pares "(Firmado)" se reemplazan por documents.documents.is_signed.
delete from documents.document_types where id in (36, 37, 38, 39, 40);

-- Atributo del archivo subido, no del tipo de catálogo: cualquier
-- document_type puede tener una versión firmada y una sin firmar.
alter table documents.documents
	add column is_signed boolean not null default false;
