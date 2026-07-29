-- Configuración de Storage: buckets + RLS sobre storage.objects.
--
-- No vive en supabase/migrations/ porque los buckets no son parte del schema
-- versionado y aplicarlo a un proyecto que ya los tiene fallaría. Es el script
-- de bootstrap para levantar un proyecto nuevo desde cero.
--
-- Aplicado a APP-SCI-PROD (juftdhznquzwvfzrrjqy) el 2026-07-28.
--
-- Solo los 4 buckets que el código usa (ver BUCKETS en
-- src/lib/infrastructure/storage/buckets.ts). Deliberadamente NO se replican
-- los buckets muertos de APP-SCI: `test`, `avatars` y `documentos_empresas`
-- (ninguno aparece en el código; en `public-assets` "avatars" es una carpeta).

-- ─── Buckets ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
	('documents', 'documents', false, 15728640, array[
		'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	]),
	('incorporation_documents', 'incorporation_documents', false, 5242880, array[
		'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
	]),
	('public-assets', 'public-assets', true, 10485760, array[
		'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'
	]),
	('templates', 'templates', false, 20971520, array[
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	])
on conflict (id) do nothing;

-- ─── Políticas: bucket `documents` (privado) ────────────
-- Escritura y lectura del dueño por carpeta `{userId}/…`; admin ve todo.
create policy documents_insert_auth on storage.objects
	for insert to public
	with check (
		bucket_id = 'documents'
		and auth.role() = 'authenticated'
		and (auth.uid())::text = (storage.foldername(name))[1]
	);

create policy documents_select_own on storage.objects
	for select to public
	using (
		bucket_id = 'documents'
		and (auth.uid())::text = (storage.foldername(name))[1]
	);

create policy documents_update_own on storage.objects
	for update to public
	using (
		bucket_id = 'documents'
		and (auth.uid())::text = (storage.foldername(name))[1]
	);

create policy documents_select_admin on storage.objects
	for select to public
	using (
		bucket_id = 'documents'
		and exists (
			select 1 from public.user_roles ur
			join public.roles r on r.id = ur.rol_id
			where ur.user_id = auth.uid() and r.name = 'admin'
		)
	);

create policy documents_delete_admin on storage.objects
	for delete to public
	using (
		bucket_id = 'documents'
		and exists (
			select 1 from public.user_roles ur
			join public.roles r on r.id = ur.rol_id
			where ur.user_id = auth.uid() and r.name = 'admin'
		)
	);

-- ─── Políticas: bucket `incorporation_documents` (privado) ───
-- La API escribe con service-role tras verificar ownership; el cliente solo lee.
create policy incorp_docs_select_own on storage.objects
	for select to public
	using (
		bucket_id = 'incorporation_documents'
		and (auth.uid())::text = (storage.foldername(name))[1]
	);

create policy incorp_docs_select_admin on storage.objects
	for select to public
	using (
		bucket_id = 'incorporation_documents'
		and exists (
			select 1 from public.user_roles ur
			join public.roles r on r.id = ur.rol_id
			where ur.user_id = auth.uid() and r.name = 'admin'
		)
	);

create policy incorp_docs_update_admin on storage.objects
	for update to public
	using (
		bucket_id = 'incorporation_documents'
		and exists (
			select 1 from public.user_roles ur
			join public.roles r on r.id = ur.rol_id
			where ur.user_id = auth.uid() and r.name = 'admin'
		)
	);

create policy incorp_docs_delete_admin on storage.objects
	for delete to public
	using (
		bucket_id = 'incorporation_documents'
		and exists (
			select 1 from public.user_roles ur
			join public.roles r on r.id = ur.rol_id
			where ur.user_id = auth.uid() and r.name = 'admin'
		)
	);

-- ─── Políticas: bucket `public-assets` (público) ────────
create policy public_assets_select_all on storage.objects
	for select to public
	using (bucket_id = 'public-assets');

create policy public_assets_insert_auth on storage.objects
	for insert to public
	with check (
		bucket_id = 'public-assets'
		and auth.role() = 'authenticated'
	);

create policy public_assets_update_own on storage.objects
	for update to public
	using (
		bucket_id = 'public-assets'
		and owner_id = (auth.uid())::text
	);

create policy public_assets_delete_own on storage.objects
	for delete to public
	using (
		bucket_id = 'public-assets'
		and owner_id = (auth.uid())::text
	);

-- ─── Políticas: bucket `templates` (privado) ────────────
create policy templates_read_all on storage.objects
	for select to public
	using (bucket_id = 'templates');

create policy templates_admin_all on storage.objects
	for all to public
	using (
		bucket_id = 'templates'
		and exists (
			select 1 from public.user_roles ur
			join public.roles r on r.id = ur.rol_id
			where ur.user_id = auth.uid() and r.name = 'admin'
		)
	);
