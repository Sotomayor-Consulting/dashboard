-- Company member addresses and reusable audit events.
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

create unique index if not exists empresas_incorporaciones_company_id_unique_idx
	on public.empresas_incorporaciones (company_id)
	where company_id is not null;

create index if not exists empresas_incorporaciones_user_id_idx
	on public.empresas_incorporaciones (user_id);

create index if not exists companies_user_id_idx
	on public.companies (user_id);

alter table public.companies
	drop constraint if exists companies_legal_status_check;

alter table public.companies
	add constraint companies_legal_status_check check (
		legal_status in (
			'draft',
			'pending_validation',
			'pending',
			'active',
			'inactive',
			'suspended',
			'dissolved'
		)
	) not valid;

alter table public.company_addresses
	add column if not exists company_id uuid references public.companies(id),
	add column if not exists updated_at timestamptz,
	add column if not exists updated_by uuid references public.usuarios(user_id),
	add column if not exists deleted_at timestamptz,
	add column if not exists deleted_by uuid references public.usuarios(user_id),
	add column if not exists delete_reason text;

update public.company_addresses ca
set company_id = ei.company_id
from public.empresas_incorporaciones ei
where ca.company_id is null
	and ca.incorporation_id = ei.empresa_incorporacion_id
	and ei.company_id is not null;

create index if not exists company_addresses_active_incorporation_idx
	on public.company_addresses (incorporation_id, type)
	where deleted_at is null;

create index if not exists company_addresses_active_company_idx
	on public.company_addresses (company_id, type)
	where deleted_at is null and company_id is not null;

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

-- ---------------------------------------------------------------------------
-- RLS helpers and policies
-- ---------------------------------------------------------------------------

create or replace function public.jwt_has_role(role_name text)
returns boolean
language sql
stable
as $$
	select coalesce(auth.jwt()->'user_roles', '[]'::jsonb) ? role_name;
$$;

create or replace function public.jwt_has_any_role(role_names text[])
returns boolean
language sql
stable
as $$
	select exists (
		select 1
		from unnest(role_names) as role_name
		where public.jwt_has_role(role_name)
	);
$$;

create or replace function public.is_company_staff()
returns boolean
language sql
stable
as $$
	select public.jwt_has_any_role(array['admin', 'gerencia', 'operaciones']);
$$;

create or replace function public.is_audit_reader()
returns boolean
language sql
stable
as $$
	select public.jwt_has_any_role(array['admin', 'gerencia']);
$$;

create or replace function public.user_can_access_incorporation(p_incorporation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select public.is_company_staff()
		or exists (
			select 1
			from public.empresas_incorporaciones ei
			where ei.empresa_incorporacion_id = p_incorporation_id
				and ei.user_id = auth.uid()
		);
$$;

create or replace function public.user_can_access_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select public.is_company_staff()
		or exists (
			select 1
			from public.companies c
			where c.id = p_company_id
				and c.user_id = auth.uid()
		)
		or exists (
			select 1
			from public.empresas_incorporaciones ei
			where ei.company_id = p_company_id
				and ei.user_id = auth.uid()
		);
$$;

alter table public.empresas_incorporaciones enable row level security;
alter table public.companies enable row level security;
alter table public.company_addresses enable row level security;
alter table public.company_members enable row level security;
alter table public.company_member_addresses enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists empresas_incorporaciones_select_accessible on public.empresas_incorporaciones;
create policy empresas_incorporaciones_select_accessible
	on public.empresas_incorporaciones
	for select
	to authenticated
	using (public.user_can_access_incorporation(empresa_incorporacion_id));

drop policy if exists empresas_incorporaciones_insert_owner_or_staff on public.empresas_incorporaciones;
create policy empresas_incorporaciones_insert_owner_or_staff
	on public.empresas_incorporaciones
	for insert
	to authenticated
	with check (
		public.is_company_staff()
		or user_id = auth.uid()
	);

drop policy if exists empresas_incorporaciones_update_owner_or_staff on public.empresas_incorporaciones;
create policy empresas_incorporaciones_update_owner_or_staff
	on public.empresas_incorporaciones
	for update
	to authenticated
	using (
		public.is_company_staff()
		or user_id = auth.uid()
	)
	with check (
		public.is_company_staff()
		or user_id = auth.uid()
	);

drop policy if exists companies_select_accessible on public.companies;
create policy companies_select_accessible
	on public.companies
	for select
	to authenticated
	using (public.user_can_access_company(id));

drop policy if exists companies_insert_owner_or_staff on public.companies;
create policy companies_insert_owner_or_staff
	on public.companies
	for insert
	to authenticated
	with check (
		public.is_company_staff()
		or user_id = auth.uid()
	);

drop policy if exists companies_update_owner_or_staff on public.companies;
create policy companies_update_owner_or_staff
	on public.companies
	for update
	to authenticated
	using (
		public.is_company_staff()
		or user_id = auth.uid()
	)
	with check (
		public.is_company_staff()
		or user_id = auth.uid()
	);

drop policy if exists company_addresses_select_accessible on public.company_addresses;
create policy company_addresses_select_accessible
	on public.company_addresses
	for select
	to authenticated
	using (
		deleted_at is null
		and (
			(
				company_id is not null
				and public.user_can_access_company(company_id)
			)
			or (
				company_id is null
				and public.user_can_access_incorporation(incorporation_id)
			)
		)
	);

drop policy if exists company_addresses_insert_accessible on public.company_addresses;
create policy company_addresses_insert_accessible
	on public.company_addresses
	for insert
	to authenticated
	with check (
		public.is_company_staff()
		and company_id is not null
		and public.user_can_access_company(company_id)
	);

drop policy if exists company_addresses_update_accessible on public.company_addresses;
create policy company_addresses_update_accessible
	on public.company_addresses
	for update
	to authenticated
	using (
		deleted_at is null
		and
		public.is_company_staff()
		and company_id is not null
		and public.user_can_access_company(company_id)
	)
	with check (
		public.is_company_staff()
		and company_id is not null
		and public.user_can_access_company(company_id)
	);

drop policy if exists company_members_select_accessible on public.company_members;
create policy company_members_select_accessible
	on public.company_members
	for select
	to authenticated
	using (
		deleted_at is null
		and public.user_can_access_company(company_id)
	);

drop policy if exists company_members_insert_accessible on public.company_members;
create policy company_members_insert_accessible
	on public.company_members
	for insert
	to authenticated
	with check (
		public.is_company_staff()
		and public.user_can_access_company(company_id)
	);

drop policy if exists company_members_update_accessible on public.company_members;
create policy company_members_update_accessible
	on public.company_members
	for update
	to authenticated
	using (
		deleted_at is null
		and
		public.is_company_staff()
		and public.user_can_access_company(company_id)
	)
	with check (
		public.is_company_staff()
		and public.user_can_access_company(company_id)
	);

drop policy if exists company_member_addresses_select_accessible on public.company_member_addresses;
create policy company_member_addresses_select_accessible
	on public.company_member_addresses
	for select
	to authenticated
	using (
		deleted_at is null
		and
		exists (
			select 1
			from public.company_members cm
			where cm.id = company_member_addresses.company_member_id
				and cm.deleted_at is null
				and public.user_can_access_company(cm.company_id)
		)
	);

drop policy if exists company_member_addresses_insert_accessible on public.company_member_addresses;
create policy company_member_addresses_insert_accessible
	on public.company_member_addresses
	for insert
	to authenticated
	with check (
		public.is_company_staff()
		and
		exists (
			select 1
			from public.company_members cm
			where cm.id = company_member_addresses.company_member_id
				and cm.deleted_at is null
				and public.user_can_access_company(cm.company_id)
		)
	);

drop policy if exists company_member_addresses_update_accessible on public.company_member_addresses;
create policy company_member_addresses_update_accessible
	on public.company_member_addresses
	for update
	to authenticated
	using (
		deleted_at is null
		and
		public.is_company_staff()
		and
		exists (
			select 1
			from public.company_members cm
			where cm.id = company_member_addresses.company_member_id
				and cm.deleted_at is null
				and public.user_can_access_company(cm.company_id)
		)
	)
	with check (
		public.is_company_staff()
		and
		exists (
			select 1
			from public.company_members cm
			where cm.id = company_member_addresses.company_member_id
				and cm.deleted_at is null
				and public.user_can_access_company(cm.company_id)
		)
	);

drop policy if exists audit_events_select_admin_gerencia on public.audit_events;
create policy audit_events_select_admin_gerencia
	on public.audit_events
	for select
	to authenticated
	using (public.is_audit_reader());

drop policy if exists audit_events_insert_authenticated_actor on public.audit_events;

revoke insert, update, delete on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;
