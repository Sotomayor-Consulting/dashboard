-- Sincroniza cambios hechos en development por dashboard (no versionados):
-- 1. Corrige el typo tax_clasification -> tax_classification (el código ya
--    usa el nombre nuevo; sin esto las vistas de companies fallan).
-- 2. Flags de confidencialidad de members/managers en companies.
-- 3. email y us_resident en members.
-- Idempotente: en development todo esto ya existe.

do $$
begin
	if exists (
		select 1 from information_schema.columns
		where table_schema = 'public'
			and table_name = 'companies'
			and column_name = 'tax_clasification'
	) then
		alter table public.companies
			rename column tax_clasification to tax_classification;
	end if;
end $$;

alter table public.companies
	add column if not exists is_managers_confidential boolean not null default false;
alter table public.companies
	add column if not exists is_members_confidential boolean not null default false;

alter table public.members
	add column if not exists email text;
alter table public.members
	add column if not exists us_resident boolean not null default false;
