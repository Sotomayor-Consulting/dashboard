-- Confidencialidad de managers/members en filings estatales.
-- MVP: dos flags independientes, sin constraint de "exactamente uno" —
-- se decide más adelante si hace falta restringir combinaciones.
alter table public.companies
	add column if not exists is_managers_confidential boolean not null default false,
	add column if not exists is_members_confidential boolean not null default false;

comment on column public.companies.is_managers_confidential is
	'Si es true, los company_members con is_manager=true NO se declaran en filings/reportes estatales (quedan confidenciales).';
comment on column public.companies.is_members_confidential is
	'Si es true, los company_members con is_member=true NO se declaran en filings/reportes estatales (quedan confidenciales).';
