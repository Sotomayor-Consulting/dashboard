begin;

drop index if exists public.company_addresses_active_incorporation_idx;

do $$
declare
	policy_name text;
begin
	for policy_name in
		select policyname
		from pg_policies
		where schemaname = 'public'
			and tablename = 'company_addresses'
	loop
		execute format(
			'drop policy if exists %I on public.company_addresses',
			policy_name
		);
	end loop;
end $$;

create policy company_addresses_select_accessible
	on public.company_addresses
	for select
	to authenticated
	using (
		deleted_at is null
		and company_id is not null
		and public.user_can_access_company(company_id)
	);

create policy company_addresses_insert_accessible
	on public.company_addresses
	for insert
	to authenticated
	with check (
		public.is_company_staff()
		and company_id is not null
		and public.user_can_access_company(company_id)
		and deleted_at is null
	);

create policy company_addresses_update_accessible
	on public.company_addresses
	for update
	to authenticated
	using (
		deleted_at is null
		and public.is_company_staff()
		and company_id is not null
		and public.user_can_access_company(company_id)
	)
	with check (true);

commit;
