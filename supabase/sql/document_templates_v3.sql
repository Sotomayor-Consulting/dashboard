alter table documents.document_templates
  add column if not exists transformer_id varchar(100);

create index if not exists idx_document_templates_transformer_id
  on documents.document_templates(transformer_id)
  where deleted_at is null;
