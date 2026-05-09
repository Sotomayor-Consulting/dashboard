-- Document management schema (Supabase/Postgres)
-- Scope:
-- - Document tables and enums live in schema: documents
-- - Transactional tables use uuid
-- - Catalog table document_types uses int4 identity
-- - Naming aligned with code: file_name, bucket_path, bucket_storage

begin;

create extension if not exists pgcrypto;
create schema if not exists documents;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_category'
			and n.nspname = 'documents'
	) then
		create type documents.document_category as enum (
			'identity',
			'address',
			'corporate',
			'tax',
			'compliance',
			'authority',
			'banking',
			'registry',
			'supporting'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_applies_to'
			and n.nspname = 'documents'
	) then
		create type documents.document_applies_to as enum (
			'user',
			'profile',
			'member',
			'company',
			'incorporation_case',
			'task',
			'stage',
			'workflow',
			'generic'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_status'
			and n.nspname = 'documents'
	) then
		create type documents.document_status as enum (
			'pending',
			'uploaded',
			'under_review',
			'approved',
			'rejected',
			'replaced',
			'expired',
			'archived'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_request_status'
			and n.nspname = 'documents'
	) then
		create type documents.document_request_status as enum (
			'pending',
			'sent',
			'uploaded',
			'under_review',
			'approved',
			'rejected',
			'cancelled'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_approval_role'
			and n.nspname = 'documents'
	) then
		create type documents.document_approval_role as enum (
			'operations',
			'legal',
			'compliance',
			'tax'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_approval_status'
			and n.nspname = 'documents'
	) then
		create type documents.document_approval_status as enum ('approved', 'rejected');
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_related_to_type'
			and n.nspname = 'documents'
	) then
		create type documents.document_related_to_type as enum (
			'user',
			'profile',
			'member',
			'company',
			'incorporation_case',
			'task',
			'stage',
			'workflow'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_relation_purpose'
			and n.nspname = 'documents'
	) then
		create type documents.document_relation_purpose as enum (
			'owner',
			'support',
			'attachment',
			'kyc',
			'filing',
			'signature',
			'internal_reference'
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_visibility'
			and n.nspname = 'documents'
	) then
		create type documents.document_visibility as enum ('internal_only', 'client_visible');
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_share_status'
			and n.nspname = 'documents'
	) then
		create type documents.document_share_status as enum ('active', 'revoked');
	end if;
end $$;

do $$
begin
	if not exists (
		select 1
		from pg_type t
		join pg_namespace n on n.oid = t.typnamespace
		where t.typname = 'document_event_type'
			and n.nspname = 'documents'
	) then
		create type documents.document_event_type as enum (
			'uploaded',
			'metadata_updated',
			'visibility_changed',
			'shared',
			'share_revoked',
			'downloaded',
			'previewed',
			'replaced',
			'approved',
			'rejected',
			'deleted',
			'restored',
			'access_denied'
		);
	end if;
end $$;

create table if not exists documents.document_types (
	id int4 generated always as identity primary key,
	code int4 not null unique,
	name varchar(150) not null,
	legal_category documents.document_category not null,
	applies_to documents.document_applies_to not null,
	description text,
	is_active boolean not null default true,
	is_expirable boolean not null default false,
	requires_approval boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists documents.document_requests (
	id uuid primary key default gen_random_uuid(),
	case_id uuid not null,
	document_type_id int4 not null,
	status documents.document_request_status not null default 'pending',
	requested_by uuid,
	requested_at timestamptz not null default now(),
	due_date date,
	message text,
	reminder_count int4 not null default 0,
	is_required boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz,
	deleted_by uuid,
	constraint document_requests_document_type_fk
		foreign key (document_type_id)
		references documents.document_types(id)
		on delete restrict,
	constraint document_requests_case_fk
		foreign key (case_id)
		references public.empresas_incorporaciones(empresa_incorporacion_id)
		on delete cascade,
	constraint document_requests_requested_by_fk
		foreign key (requested_by)
		references auth.users(id)
		on delete set null,
	constraint document_requests_deleted_by_fk
		foreign key (deleted_by)
		references auth.users(id)
		on delete set null
);

create table if not exists documents.documents (
	id uuid primary key default gen_random_uuid(),
	case_id uuid not null,
	document_type_id int4 not null,
	document_request_id uuid,
	file_name varchar(255) not null,
	bucket_storage varchar(255) not null,
	bucket_path varchar(500) not null,
	file_title varchar(255),
	mime_type varchar(100),
	file_size_bytes bigint not null,
	status documents.document_status not null default 'uploaded',
	visibility documents.document_visibility not null default 'internal_only',
	issue_date date,
	expiry_date date,
	is_sensitive boolean not null default true,
	content_hash char(64),
	version int4 not null default 1,
	document_group_id uuid,
	notes text,
	uploaded_by uuid not null,
	uploaded_at timestamptz not null default now(),
	updated_by uuid,
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	created_by uuid,
	deleted_at timestamptz,
	deleted_by uuid,
	constraint documents_file_size_positive check (file_size_bytes > 0),
	constraint documents_version_positive check (version >= 1),
	constraint documents_expiry_after_issue
		check (expiry_date is null or issue_date is null or expiry_date >= issue_date),
	constraint documents_document_type_fk
		foreign key (document_type_id)
		references documents.document_types(id)
		on delete restrict,
	constraint documents_document_request_fk
		foreign key (document_request_id)
		references documents.document_requests(id)
		on delete set null,
	constraint documents_case_fk
		foreign key (case_id)
		references public.empresas_incorporaciones(empresa_incorporacion_id)
		on delete cascade,
	constraint documents_uploaded_by_fk
		foreign key (uploaded_by)
		references auth.users(id)
		on delete restrict,
	constraint documents_updated_by_fk
		foreign key (updated_by)
		references auth.users(id)
		on delete set null,
	constraint documents_created_by_fk
		foreign key (created_by)
		references auth.users(id)
		on delete set null,
	constraint documents_deleted_by_fk
		foreign key (deleted_by)
		references auth.users(id)
		on delete set null
);

create table if not exists documents.document_links (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null,
	related_to_type documents.document_related_to_type not null,
	related_to_id uuid not null,
	relation_purpose documents.document_relation_purpose not null default 'owner',
	is_primary boolean not null default false,
	created_at timestamptz not null default now(),
	created_by uuid,
	constraint document_links_document_fk
		foreign key (document_id)
		references documents.documents(id)
		on delete cascade,
	constraint document_links_created_by_fk
		foreign key (created_by)
		references auth.users(id)
		on delete set null
);

create table if not exists documents.document_request_links (
	id uuid primary key default gen_random_uuid(),
	document_request_id uuid not null,
	related_to_type documents.document_related_to_type not null,
	related_to_id uuid not null,
	relation_purpose documents.document_relation_purpose not null default 'owner',
	is_primary boolean not null default false,
	created_at timestamptz not null default now(),
	created_by uuid,
	constraint document_request_links_request_fk
		foreign key (document_request_id)
		references documents.document_requests(id)
		on delete cascade,
	constraint document_request_links_created_by_fk
		foreign key (created_by)
		references auth.users(id)
		on delete set null
);

create table if not exists documents.document_approvals (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null,
	approval_role documents.document_approval_role not null,
	approval_status documents.document_approval_status not null,
	comments text,
	approved_by uuid,
	approved_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	constraint document_approvals_document_fk
		foreign key (document_id)
		references documents.documents(id)
		on delete cascade,
	constraint document_approvals_approved_by_fk
		foreign key (approved_by)
		references auth.users(id)
		on delete set null
);

create table if not exists documents.document_shares (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null,
	case_id uuid not null,
	shared_with_user_id uuid not null,
	shared_by_user_id uuid not null,
	share_status documents.document_share_status not null default 'active',
	shared_at timestamptz not null default now(),
	revoked_at timestamptz,
	revoked_by_user_id uuid,
	expires_at timestamptz,
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint document_shares_document_fk
		foreign key (document_id)
		references documents.documents(id)
		on delete cascade,
	constraint document_shares_case_fk
		foreign key (case_id)
		references public.empresas_incorporaciones(empresa_incorporacion_id)
		on delete cascade,
	constraint document_shares_shared_with_fk
		foreign key (shared_with_user_id)
		references auth.users(id)
		on delete cascade,
	constraint document_shares_shared_by_fk
		foreign key (shared_by_user_id)
		references auth.users(id)
		on delete cascade,
	constraint document_shares_revoked_by_fk
		foreign key (revoked_by_user_id)
		references auth.users(id)
		on delete set null
);

create table if not exists documents.document_events (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null,
	case_id uuid not null,
	event_type documents.document_event_type not null,
	from_status text,
	to_status text,
	actor_user_id uuid not null,
	actor_role text not null,
	notes text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	constraint document_events_document_fk
		foreign key (document_id)
		references documents.documents(id)
		on delete cascade,
	constraint document_events_case_fk
		foreign key (case_id)
		references public.empresas_incorporaciones(empresa_incorporacion_id)
		on delete cascade,
	constraint document_events_actor_fk
		foreign key (actor_user_id)
		references auth.users(id)
		on delete cascade
);

create unique index if not exists uq_document_links_tuple
	on documents.document_links(document_id, related_to_type, related_to_id, relation_purpose);

create unique index if not exists uq_document_request_links_tuple
	on documents.document_request_links(document_request_id, related_to_type, related_to_id, relation_purpose);

create unique index if not exists uq_document_shares_document_user
	on documents.document_shares(document_id, shared_with_user_id);

create index if not exists idx_documents_case_id on documents.documents(case_id);
create index if not exists idx_documents_document_type_id on documents.documents(document_type_id);
create index if not exists idx_documents_document_request_id on documents.documents(document_request_id);
create index if not exists idx_documents_case_visibility on documents.documents(case_id, visibility);
create index if not exists idx_documents_case_status on documents.documents(case_id, status);
create index if not exists idx_documents_active_case_status
	on documents.documents(case_id, status)
	where deleted_at is null;
create index if not exists idx_documents_content_hash on documents.documents(content_hash);
create index if not exists idx_documents_document_group_id on documents.documents(document_group_id);
create index if not exists idx_documents_bucket_path on documents.documents(bucket_path);

create index if not exists idx_document_links_related on documents.document_links(related_to_type, related_to_id);
create index if not exists idx_document_links_document on documents.document_links(document_id);

create index if not exists idx_document_requests_case_id on documents.document_requests(case_id);
create index if not exists idx_document_requests_case_status on documents.document_requests(case_id, status);
create index if not exists idx_document_requests_active_case_status
	on documents.document_requests(case_id, status)
	where deleted_at is null;

create index if not exists idx_document_request_links_related
	on documents.document_request_links(related_to_type, related_to_id);
create index if not exists idx_document_request_links_request
	on documents.document_request_links(document_request_id);

create index if not exists idx_document_approvals_document on documents.document_approvals(document_id);
create index if not exists idx_document_approvals_document_role on documents.document_approvals(document_id, approval_role);

create index if not exists idx_document_shares_document on documents.document_shares(document_id);
create index if not exists idx_document_shares_case on documents.document_shares(case_id);
create index if not exists idx_document_shares_shared_with on documents.document_shares(shared_with_user_id);
create index if not exists idx_document_shares_document_user_status
	on documents.document_shares(document_id, shared_with_user_id, share_status);
create index if not exists idx_document_shares_case_user_status
	on documents.document_shares(case_id, shared_with_user_id, share_status);
create index if not exists idx_document_shares_active_document_user
	on documents.document_shares(document_id, shared_with_user_id)
	where share_status = 'active';

create index if not exists idx_document_events_document on documents.document_events(document_id);
create index if not exists idx_document_events_case on documents.document_events(case_id);
create index if not exists idx_document_events_type on documents.document_events(event_type);
create index if not exists idx_document_events_created_at_desc on documents.document_events(created_at desc);

commit;
