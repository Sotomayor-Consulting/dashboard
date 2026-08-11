-- Depura documents.document_types: el código numérico (1xxx/2xxx/3xxx/9xxx)
-- codificaba a mano applies_to; la UI ahora agrupa/ordena solo por
-- legal_category. Se reemplaza el único uso funcional de code (lookup del
-- tipo "Other" en domains/templates/templates.ts) por un slug estable.
alter table documents.document_types add column slug text;

update documents.document_types set slug = 'other_generic' where code = 9001;

alter table documents.document_types
	add constraint document_types_slug_key unique (slug);

alter table documents.document_types drop constraint document_types_code_key;

alter table documents.document_types drop column code;
