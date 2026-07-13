-- Migration: document_templates_fix
-- Corrects the document_templates table to re-use documents.documents
-- for file storage and document_links for the polymorphic relationship.
-- Adds source_url for externally-hosted templates (e.g. IRS forms).

-- =============================================================================
-- 1. Make case_id nullable in documents.documents
--    Templates are not tied to any incorporation case
-- =============================================================================

alter table documents.documents alter column case_id drop not null;

-- =============================================================================
-- 2. Remove redundant columns from document_templates
--    File management is delegated to documents.documents
-- =============================================================================

alter table documents.document_templates
  drop column if exists file_name,
  drop column if exists bucket_path,
  drop column if exists file_size_bytes,
  drop column if exists mime_type;

-- =============================================================================
-- 3. Add source_url for externally-hosted templates
-- =============================================================================

alter table documents.document_templates
  add column if not exists source_url text;
