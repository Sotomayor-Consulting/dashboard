-- Segundo recorte del catálogo: 13 → 10 tipos.
--
-- Continúa 20260810210000 (34 → 13). Se retiran los tres tipos que respaldan
-- etapas del workflow que todavía no producen ningún documento archivable:
--
--   ein_document      → etapa ein_request
--   boir_registration → etapa boir_registration
--   form_8832         → etapa tax_election_8832
--
-- Los tres tienen cero documentos y cero solicitudes en todo el histórico de
-- dev. Se reponen con un INSERT cuando esas etapas empiecen a generar el
-- documento; el slug los mantiene estables entre proyectos, así que reponerlos
-- no vuelve a introducir el problema de los IDs literales.
--
-- Queda un catálogo de 10, todos con uso real o con recogida activa:
--
--   passport                  14 documentos
--   national_id                4 documentos · 2 solicitudes
--   proof_of_address           0 en tabla, pero SÍ se recoge hoy: son las
--                              ranuras member-factura / manager-factura /
--                              company-utility-us del formulario de
--                              incorporación, que suben al bucket
--                              incorporation_documents sin registrarse en
--                              documents.documents. No se elimina: el hueco
--                              está en el registro, no en el tipo.
--   articles_of_organization   4 documentos · 1 solicitud
--   operating_agreement       25 documentos · 2 solicitudes
--   planning_design_report    15 documentos
--   incorporation_certificate  2 documentos
--   partner_contract           1 documento  · 1 solicitud
--   form_ss4                   1 documento
--   other_generic            143 documentos
--
-- Solo dev. Producción sigue pendiente del bloque completo.

begin;

delete from documents.document_types
where slug in ('ein_document', 'boir_registration', 'form_8832');

commit;
