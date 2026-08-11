-- Renumera documents.document_types a IDs secuenciales 1..9.
--
-- Tras los recortes (40 → 9) los IDs quedaron con huecos: 1, 3, 4, 5, 6, 11,
-- 20, 23, 25. Esta migración los compacta a 1..9 y arrastra las referencias
-- de documents.documents y documents.document_requests.
--
-- NINGÚN DOCUMENTO CAMBIA DE TIPO. Los 66 documentos que hoy están bien
-- clasificados conservan su tipo; solo cambia el número que lo identifica.
--
-- El mapa se define POR SLUG, no por ID literal: así la migración es correcta
-- en cualquier proyecto, incluido producción, que hoy tiene 40 tipos con
-- numeración distinta. Un guardia aborta si el catálogo no coincide con el
-- mapa, para que no se aplique a medias sobre un catálogo inesperado.
--
-- AVISO — los IDs son parte del contrato con el exterior
-- ------------------------------------------------------
-- `documents.documents` admite inserciones directas vía REST/PostgREST desde
-- procesos externos (n8n). Si alguno de ellos referencia document_type_id por
-- número, hay que actualizarlo. Dentro de la aplicación no aplica: desde
-- 20260810210000 el código resuelve los tipos por slug y no queda ningún ID
-- literal.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. Guardia: el catálogo debe ser exactamente estos 9 slugs.
-- ─────────────────────────────────────────────────────────────
do $$
declare
	v_esperados constant text[] := array[
		'articles_of_organization', 'partner_contract', 'identity_document',
		'planning_design_report', 'other_generic', 'proof_of_address',
		'incorporation_certificate', 'operating_agreement', 'form_ss4'
	];
	v_actuales text[];
begin
	select array_agg(slug order by slug) into v_actuales
	from documents.document_types;

	if v_actuales is distinct from (
		select array_agg(s order by s) from unnest(v_esperados) s
	) then
		raise exception
			'El catálogo no coincide con el mapa de renumeración. Actual: %',
			v_actuales;
	end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Soltar las FK y la identidad para poder reescribir la PK.
-- ─────────────────────────────────────────────────────────────
alter table documents.documents
	drop constraint documents_document_type_fk;
alter table documents.document_requests
	drop constraint document_requests_document_type_fk;

alter table documents.document_types
	alter column id drop identity;

-- ─────────────────────────────────────────────────────────────
-- 3. Desplazar +1000 para que el remapeo no colisione con IDs vivos
--    (p. ej. 3 → 2 mientras el 2 aún podría existir).
-- ─────────────────────────────────────────────────────────────
update documents.document_types set id = id + 1000;
update documents.documents set document_type_id = document_type_id + 1000;
update documents.document_requests set document_type_id = document_type_id + 1000;

-- ─────────────────────────────────────────────────────────────
-- 4. Remapear hijos primero (las FK están sueltas, el orden es indiferente).
-- ─────────────────────────────────────────────────────────────
update documents.documents d
set document_type_id = m.new_id
from (values
	('articles_of_organization', 1),
	('partner_contract', 2),
	('identity_document', 3),
	('planning_design_report', 4),
	('other_generic', 5),
	('proof_of_address', 6),
	('incorporation_certificate', 7),
	('operating_agreement', 8),
	('form_ss4', 9)
) as m(slug, new_id)
join documents.document_types t on t.slug = m.slug
where d.document_type_id = t.id;

update documents.document_requests q
set document_type_id = m.new_id
from (values
	('articles_of_organization', 1),
	('partner_contract', 2),
	('identity_document', 3),
	('planning_design_report', 4),
	('other_generic', 5),
	('proof_of_address', 6),
	('incorporation_certificate', 7),
	('operating_agreement', 8),
	('form_ss4', 9)
) as m(slug, new_id)
join documents.document_types t on t.slug = m.slug
where q.document_type_id = t.id;

-- ─────────────────────────────────────────────────────────────
-- 5. Y el catálogo.
-- ─────────────────────────────────────────────────────────────
update documents.document_types t
set id = m.new_id
from (values
	('articles_of_organization', 1),
	('partner_contract', 2),
	('identity_document', 3),
	('planning_design_report', 4),
	('other_generic', 5),
	('proof_of_address', 6),
	('incorporation_certificate', 7),
	('operating_agreement', 8),
	('form_ss4', 9)
) as m(slug, new_id)
where t.slug = m.slug;

-- ─────────────────────────────────────────────────────────────
-- 6. Restituir identidad y FK. La secuencia arranca en 10 para no
--    reutilizar ninguno de los IDs recién asignados.
-- ─────────────────────────────────────────────────────────────
alter table documents.document_types
	alter column id add generated always as identity (start with 10);

alter table documents.documents
	add constraint documents_document_type_fk
	foreign key (document_type_id)
	references documents.document_types(id) on delete restrict;

alter table documents.document_requests
	add constraint document_requests_document_type_fk
	foreign key (document_type_id)
	references documents.document_types(id) on delete restrict;

commit;
