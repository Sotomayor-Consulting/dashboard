-- Supabase RLS baseline for the new document dashboard tables.
-- Review and adapt to your schema and desired access rules before applying.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table documents.documents enable row level security;
alter table documents.document_links enable row level security;
alter table documents.document_requests enable row level security;
alter table documents.document_request_links enable row level security;
alter table documents.document_approvals enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: ownership via empresas_incorporaciones.user_id
-- Assumes:
-- - empresas_incorporaciones.empresa_incorporacion_id is the incorporation case id
-- - empresas_incorporaciones.user_id is the owner (auth.uid())
-- - document_*_links.related_to_type = 'incorporation_case' for this dashboard
-- ---------------------------------------------------------------------------

-- documents: SELECT if the document is linked to an incorporation case owned by auth.uid()
create policy documents_select_own_incorp_case
on documents.documents
for select
using (
	exists (
		select 1
		from documents.document_links dl
		join public.empresas_incorporaciones ei
			on ei.empresa_incorporacion_id = dl.related_to_id
		where dl.document_id = documents.id
			and dl.related_to_type = 'incorporation_case'
			and ei.user_id = auth.uid()
	)
);

-- documents: INSERT only if uploaded_by is auth.uid() and request belongs to the same owned case
create policy documents_insert_own_incorp_case
on documents.documents
for insert
with check (
	uploaded_by = auth.uid()
	and exists (
		select 1
		from documents.document_request_links drl
		join public.empresas_incorporaciones ei
			on ei.empresa_incorporacion_id = drl.related_to_id
		where drl.document_request_id = documents.document_request_id
			and drl.related_to_type = 'incorporation_case'
			and ei.user_id = auth.uid()
	)
);

-- document_links: SELECT if the linked case is owned by auth.uid()
create policy document_links_select_own_incorp_case
on documents.document_links
for select
using (
	related_to_type = 'incorporation_case'
	and exists (
		select 1
		from public.empresas_incorporaciones ei
		where ei.empresa_incorporacion_id = document_links.related_to_id
			and ei.user_id = auth.uid()
	)
);

-- document_links: INSERT allowed when the creator owns the case and the document is theirs.
create policy document_links_insert_own_incorp_case
on documents.document_links
for insert
with check (
	created_by = auth.uid()
	and related_to_type = 'incorporation_case'
	and exists (
		select 1
		from public.empresas_incorporaciones ei
		where ei.empresa_incorporacion_id = document_links.related_to_id
			and ei.user_id = auth.uid()
	)
	and exists (
		select 1
		from documents.documents d
		where d.id = document_links.document_id
			and d.uploaded_by = auth.uid()
	)
);

-- document_requests: SELECT if linked to an owned incorporation case
create policy document_requests_select_own_incorp_case
on documents.document_requests
for select
using (
	exists (
		select 1
		from documents.document_request_links drl
		join public.empresas_incorporaciones ei
			on ei.empresa_incorporacion_id = drl.related_to_id
		where drl.document_request_id = document_requests.id
			and drl.related_to_type = 'incorporation_case'
			and ei.user_id = auth.uid()
	)
);

-- document_request_links: SELECT if linked case is owned by auth.uid()
create policy document_request_links_select_own_incorp_case
on documents.document_request_links
for select
using (
	related_to_type = 'incorporation_case'
	and exists (
		select 1
		from public.empresas_incorporaciones ei
		where ei.empresa_incorporacion_id = document_request_links.related_to_id
			and ei.user_id = auth.uid()
	)
);

-- document_approvals: SELECT if approval's document is readable by the user
create policy document_approvals_select_if_document_readable
on documents.document_approvals
for select
using (
	exists (
		select 1
		from documents.document_links dl
		join public.empresas_incorporaciones ei
			on ei.empresa_incorporacion_id = dl.related_to_id
		where dl.document_id = document_approvals.document_id
			and dl.related_to_type = 'incorporation_case'
			and ei.user_id = auth.uid()
	)
);

-- NOTE:
-- - The policies above do NOT include UPDATE/DELETE rules.
-- - Tighten/expand as needed for roles like operations/legal/compliance.
