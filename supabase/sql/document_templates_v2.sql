-- Migration: document_templates_v2
-- Sincroniza el SQL versionado con el estado real de la DB:
-- agrega field_mapping (jsonb) y related_to_type (enum) a documents.document_templates.
-- Idempotente — seguro de re-ejecutar.

alter table documents.document_templates
  add column if not exists field_mapping jsonb not null default '{}'::jsonb;

alter table documents.document_templates
  add column if not exists related_to_type documents.document_related_to_type;

-- Índice para los filtros del listado por entidad asociada (UI: GenerateDocumentsTab).
create index if not exists idx_document_templates_related_to_type
  on documents.document_templates(related_to_type)
  where deleted_at is null;

-- Seed: tipo genérico "Other" para archivos que no encajan en el catálogo
-- principal (ej. archivos fuente de plantillas). Lo consume
-- domains/templates/templates.ts vía lookup por code = 9001.
insert into documents.document_types (code, name, legal_category, applies_to, description, is_active, is_expirable, requires_approval)
values (
  9001,
  'Other',
  'supporting',
  'generic',
  'Tipo genérico para archivos que no encajan en el catálogo principal (ej. archivos fuente de plantillas, uploads ad-hoc).',
  true,
  false,
  false
)
on conflict (code) do nothing;
