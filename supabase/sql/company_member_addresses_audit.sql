-- Canonical member addresses and reusable audit events.
-- This migration is intentionally additive: legacy tables remain untouched.

create extension if not exists pgcrypto;

create table if not exists public.audit_events (
	id uuid primary key default gen_random_uuid(),
	entity_type text not null,
	entity_id text not null,
	parent_type text,
	parent_id text,
	action text not null,
	before_data jsonb,
	after_data jsonb,
	changed_by uuid references public.usuarios(user_id),
	created_at timestamptz not null default now(),
	constraint audit_events_action_check check (
		action in ('create', 'update', 'soft_delete', 'restore')
	)
);

create index if not exists audit_events_entity_created_idx
	on public.audit_events (entity_type, entity_id, created_at desc);

create index if not exists audit_events_parent_created_idx
	on public.audit_events (parent_type, parent_id, created_at desc)
	where parent_type is not null and parent_id is not null;

alter table public.empresas_incorporaciones
	add column if not exists company_id uuid references public.companies(id);

create index if not exists empresas_incorporaciones_company_id_idx
	on public.empresas_incorporaciones (company_id)
	where company_id is not null;

alter table public.company_addresses
	add column if not exists updated_at timestamptz,
	add column if not exists updated_by uuid references public.usuarios(user_id),
	add column if not exists deleted_at timestamptz,
	add column if not exists deleted_by uuid references public.usuarios(user_id),
	add column if not exists delete_reason text;

create index if not exists company_addresses_active_incorporation_idx
	on public.company_addresses (incorporation_id, type)
	where deleted_at is null;

alter table public.company_members
	add column if not exists full_name text,
	add column if not exists email text,
	add column if not exists member_type text,
	add column if not exists country_nationality_id integer references public.countries(id),
	add column if not exists marital_status text,
	add column if not exists is_us_tax_resident boolean,
	add column if not exists passport_number text,
	add column if not exists ssn text,
	add column if not exists itin text,
	add column if not exists deleted_at timestamptz,
	add column if not exists deleted_by uuid references public.usuarios(user_id),
	add column if not exists delete_reason text;

create index if not exists company_members_active_company_idx
	on public.company_members (company_id, is_member, is_manager)
	where deleted_at is null;

create table if not exists public.company_member_addresses (
	id bigint generated always as identity primary key,
	company_member_id bigint not null references public.company_members(id),
	type text not null,
	line1 text not null,
	line2 text,
	city text,
	state_id integer references public.states(id),
	state text,
	country_id integer references public.countries(id),
	zip text,
	is_primary boolean not null default false,
	created_at timestamptz not null default now(),
	created_by uuid references public.usuarios(user_id),
	updated_at timestamptz,
	updated_by uuid references public.usuarios(user_id),
	deleted_at timestamptz,
	deleted_by uuid references public.usuarios(user_id),
	delete_reason text,
	constraint company_member_addresses_type_check check (
		type in ('tax', 'residence', 'mailing', 'other')
	)
);

create index if not exists company_member_addresses_active_member_idx
	on public.company_member_addresses (company_member_id, type)
	where deleted_at is null;

create unique index if not exists company_member_addresses_one_primary_per_type_idx
	on public.company_member_addresses (company_member_id, type)
	where is_primary = true and deleted_at is null;
