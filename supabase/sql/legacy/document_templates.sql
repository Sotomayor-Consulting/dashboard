-- Migration: document_templates
-- Adds template management infrastructure for PDF/Word document generation

-- =============================================================================
-- Step 1: Extend existing enums
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- These must be applied separately if the tool wraps in a transaction.
-- =============================================================================

alter type documents.document_related_to_type add value if not exists 'template';
alter type documents.document_relation_purpose add value if not exists 'generated_from';

-- =============================================================================
-- Step 2: Create document_template_type enum
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'document_template_type'
      and n.nspname = 'documents'
  ) then
    create type documents.document_template_type as enum ('word', 'pdf');
  end if;
end $$;

-- =============================================================================
-- Step 3: Create document_templates table
-- =============================================================================

-- NOTE: After the first run, document_templates_fix.sql corrected this table.
-- File columns removed in favor of documents.documents + document_links.
-- See document_templates_fix.sql for the ALTER statements.

create table if not exists documents.document_templates (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  category varchar(100),
  template_type documents.document_template_type not null,
  source_url text,
  field_definitions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  version int4 not null default 1,
  created_by uuid not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid,
  constraint document_templates_version_positive check (version >= 1),
  constraint document_templates_created_by_fk
    foreign key (created_by)
    references auth.users(id)
    on delete restrict,
  constraint document_templates_updated_by_fk
    foreign key (updated_by)
    references auth.users(id)
    on delete set null,
  constraint document_templates_deleted_by_fk
    foreign key (deleted_by)
    references auth.users(id)
    on delete set null
);

-- =============================================================================
-- Step 4: Indexes
-- =============================================================================

create index if not exists idx_document_templates_active
  on documents.document_templates(is_active)
  where deleted_at is null;

create index if not exists idx_document_templates_category
  on documents.document_templates(category);

create index if not exists idx_document_templates_type
  on documents.document_templates(template_type);

-- =============================================================================
-- Step 5: RLS
-- =============================================================================

alter table documents.document_templates enable row level security;

-- Admins can manage all templates
create policy "document_templates_admin_all"
  on documents.document_templates
  for all
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.rol_id
      where ur.user_id = auth.uid()
      and r.name = 'admin'
    )
  );

-- All authenticated users can read active templates
create policy "document_templates_read_active"
  on documents.document_templates
  for select
  using (is_active = true and deleted_at is null);

-- =============================================================================
-- Step 6: Storage bucket for templates
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'templates',
  'templates',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Allow admins to manage files in templates bucket
create policy "templates_admin_all"
  on storage.objects
  for all
  using (
    bucket_id = 'templates'
    and exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.rol_id
      where ur.user_id = auth.uid()
      and r.name = 'admin'
    )
  );

-- Allow authenticated users to read templates
create policy "templates_read_all"
  on storage.objects
  for select
  using (bucket_id = 'templates');
