-- Document sharing model for operations/admin/client flows
-- Run this script in Supabase SQL editor.

begin;

alter table public.documents
	add column if not exists case_id uuid null,
	add column if not exists visibility text not null default 'internal_only';

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'documents_visibility_check'
	) then
		alter table public.documents
			add constraint documents_visibility_check
			check (visibility in ('internal_only', 'client_visible'));
	end if;
end $$;

create index if not exists idx_documents_case_id on public.documents(case_id);
create index if not exists idx_documents_visibility on public.documents(visibility);

create table if not exists public.document_shares (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null references public.documents(id) on delete cascade,
	shared_with_user_id uuid not null references auth.users(id) on delete cascade,
	shared_by_user_id uuid not null references auth.users(id) on delete cascade,
	shared_at timestamptz not null default now(),
	share_status text not null default 'active',
	updated_at timestamptz not null default now()
);

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'document_shares_status_check'
	) then
		alter table public.document_shares
			add constraint document_shares_status_check
			check (share_status in ('active', 'revoked'));
	end if;
end $$;

create unique index if not exists uq_document_shares_document_user
	on public.document_shares(document_id, shared_with_user_id);
create index if not exists idx_document_shares_document on public.document_shares(document_id);
create index if not exists idx_document_shares_user on public.document_shares(shared_with_user_id);
create index if not exists idx_document_shares_status on public.document_shares(share_status);

alter table public.document_shares enable row level security;

drop policy if exists document_shares_select_self_or_uploader on public.document_shares;
create policy document_shares_select_self_or_uploader
on public.document_shares
for select
to authenticated
using (shared_with_user_id = auth.uid() or shared_by_user_id = auth.uid());

create table if not exists public.document_events (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null references public.documents(id) on delete cascade,
	case_id uuid null,
	event_type text not null,
	from_status text null,
	to_status text null,
	actor_user_id uuid not null references auth.users(id) on delete cascade,
	actor_role text not null,
	notes text null,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index if not exists idx_document_events_document on public.document_events(document_id);
create index if not exists idx_document_events_case on public.document_events(case_id);
create index if not exists idx_document_events_type on public.document_events(event_type);
create index if not exists idx_document_events_created_at on public.document_events(created_at desc);

alter table public.document_events enable row level security;

drop policy if exists document_events_select_actor on public.document_events;
create policy document_events_select_actor
on public.document_events
for select
to authenticated
using (actor_user_id = auth.uid());

commit;
