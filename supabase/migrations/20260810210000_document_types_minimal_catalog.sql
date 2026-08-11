-- Depuración del catálogo `documents.document_types`: 34 → 13 tipos.
--
-- Continúa la limpieza del 2026-08-07 (40 → 34), que ya había quitado los
-- duplicados "(Firmado)" y la columna `code`.
--
-- Motivo: de 205 documentos en dev, 143 (70%) están tipificados como "Other".
-- Un catálogo de 34 entradas donde siete de cada diez cargas caen en el
-- genérico no está clasificando; solo añade fricción al subir.
--
-- Los 9 tipos con datos se conservan intactos: ninguna fila de
-- documents.documents ni de document_requests se reasigna. Los 21 eliminados
-- tienen cero documentos y cero solicitudes (verificado antes de aplicar; el
-- FK es ON DELETE RESTRICT, así que fallaría en voz alta si no fuera cierto).
--
-- Solo se aplica en APP-SCI (dev). Producción queda pendiente junto con el
-- resto del bloque de migraciones sin propagar.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. Slugs estables para los 13 supervivientes.
--
--    La columna se creó el 2026-08-07 pero solo se pobló 'other_generic'.
--    El código todavía referencia dos tipos por ID literal
--    (PLANNING_DESIGN_DOC_TYPE_ID = 5, PARTNER_CONTRACT_TYPE_ID = 3): hoy
--    coinciden con producción por casualidad, y cualquier resiembra los
--    rompería en silencio. Con slug se referencian por identidad estable.
-- ─────────────────────────────────────────────────────────────
update documents.document_types set slug = 'passport'                 where id = 4;
update documents.document_types set slug = 'national_id'              where id = 10;
update documents.document_types set slug = 'proof_of_address'         where id = 11;
update documents.document_types set slug = 'articles_of_organization' where id = 1;
update documents.document_types set slug = 'operating_agreement'      where id = 23;
update documents.document_types set slug = 'planning_design_report'   where id = 5;
update documents.document_types set slug = 'incorporation_certificate' where id = 20;
update documents.document_types set slug = 'partner_contract'         where id = 3;
update documents.document_types set slug = 'form_ss4'                 where id = 25;
update documents.document_types set slug = 'ein_document'             where id = 30;
update documents.document_types set slug = 'form_8832'                where id = 34;
update documents.document_types set slug = 'boir_registration'        where id = 32;
-- id 6 ya tiene slug 'other_generic'.

-- ─────────────────────────────────────────────────────────────
-- 2. Normalización de los supervivientes.
--
--    - id 4 era el único nombre en inglés y minúscula ('passport'); el resto
--      del catálogo se pasó a español.
--    - id 11 absorbe los cinco comprobantes de domicilio solapados (8, 12,
--      16, 19 y él mismo), así que deja de ser específico de "factura de
--      servicios" y de aplicar solo a `member`.
--    - id 30 absorbe el trámite de EIN completo (28 solicitud, 31 carta 147C).
--    - id 34 absorbe el 35 (certificado de recepción del 8832).
-- ─────────────────────────────────────────────────────────────
update documents.document_types
set name = 'Pasaporte',
	description = 'Pasaporte vigente del socio o manager.'
where id = 4;

update documents.document_types
set name = 'Comprobante de Domicilio',
	applies_to = 'generic',
	description =
		'Factura de servicios, estado de cuenta o equivalente que acredite el '
		'domicilio del socio o de la empresa.'
where id = 11;

update documents.document_types
set name = 'Documento EIN',
	description =
		'Documento que acredita el EIN: confirmación del IRS o carta de '
		'verificación 147C.'
where id = 30;

update documents.document_types
set name = 'Formulario 8832',
	description =
		'Elección de clasificación fiscal ante el IRS, incluido su certificado '
		'de recepción.'
where id = 34;

-- ─────────────────────────────────────────────────────────────
-- 3. Fuera los 21 tipos sin uso.
--
--    identity alternativa (9, 14, 15, 18) — pasaporte y cédula cubren.
--    domicilio duplicado (8, 12, 16, 19) — absorbidos por el id 11.
--    EIN duplicado (28, 31) y 8832 duplicado (35).
--    fiscal de socio (13), registro mal clasificado (7, estaba como `member`).
--    notarial/cumplimiento sin uso (17, 24, 26).
--    corporativos sin uso (21, 27) y bancario (33).
--    operativos internos, no documentos de cliente (22, 29).
-- ─────────────────────────────────────────────────────────────
delete from documents.document_types
where id in (
	7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19,
	21, 22, 24, 26, 27, 28, 29, 31, 33, 35
);

-- ─────────────────────────────────────────────────────────────
-- 4. El slug pasa a ser obligatorio: es la forma de referenciar un tipo
--    desde el código sin depender del ID autogenerado.
-- ─────────────────────────────────────────────────────────────
alter table documents.document_types
	alter column slug set not null;

commit;
