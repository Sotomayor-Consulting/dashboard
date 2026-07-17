-- Optimización de RLS, índices y hardening de funciones.
-- Origen: auditoría con el linter oficial de Supabase (advisors) — julio 2026.

-- ============================================================
-- 1. RLS initplan: envolver auth.uid() en (select ...) para que
--    se evalúe una vez por query en lugar de una vez por fila.
-- ============================================================

alter policy document_approvals_select_access on documents.document_approvals using ((documents.is_staff() OR (EXISTS ( SELECT 1
   FROM documents.documents d
  WHERE ((d.id = document_approvals.document_id) AND ((d.uploaded_by = (select auth.uid())) OR ((d.visibility = 'client_visible'::documents.document_visibility) AND (EXISTS ( SELECT 1
           FROM documents.document_shares ds
          WHERE ((ds.document_id = d.id) AND (ds.shared_with_user_id = (select auth.uid())) AND (ds.share_status = 'active'::documents.document_share_status)))))))))));
alter policy document_events_select_actor on documents.document_events using ((actor_user_id = (select auth.uid())));
alter policy document_links_select_access on documents.document_links using ((documents.is_staff() OR (EXISTS ( SELECT 1
   FROM documents.documents d
  WHERE ((d.id = document_links.document_id) AND ((d.uploaded_by = (select auth.uid())) OR ((d.visibility = 'client_visible'::documents.document_visibility) AND (EXISTS ( SELECT 1
           FROM documents.document_shares ds
          WHERE ((ds.document_id = d.id) AND (ds.shared_with_user_id = (select auth.uid())) AND (ds.share_status = 'active'::documents.document_share_status)))))))))));
alter policy document_links_self_or_staff on documents.document_links using ((is_workflow_staff((select auth.uid())) OR ((related_to_type = 'incorporation_case'::documents.document_related_to_type) AND (EXISTS ( SELECT 1
   FROM incorporations ei
  WHERE ((ei.id = document_links.related_to_id) AND (ei.user_id = (select auth.uid()))))))));
alter policy document_request_links_select_access on documents.document_request_links using ((documents.is_staff() OR (EXISTS ( SELECT 1
   FROM (documents.document_requests dr
     JOIN incorporations i ON ((i.id = dr.case_id)))
  WHERE ((dr.id = document_request_links.document_request_id) AND (i.user_id = (select auth.uid())))))));
alter policy document_requests_select_access on documents.document_requests using ((documents.is_staff() OR (EXISTS ( SELECT 1
   FROM incorporations i
  WHERE ((i.id = document_requests.case_id) AND (i.user_id = (select auth.uid())))))));
alter policy document_shares_select_self_or_uploader on documents.document_shares using ((documents.is_staff() OR (shared_with_user_id = (select auth.uid())) OR (shared_by_user_id = (select auth.uid()))));
alter policy document_templates_admin_all on documents.document_templates using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.rol_id)))
  WHERE ((ur.user_id = (select auth.uid())) AND (r.name = 'admin'::text)))));
alter policy documents_select_access on documents.documents using ((documents.is_staff() OR (uploaded_by = (select auth.uid())) OR ((visibility = 'client_visible'::documents.document_visibility) AND (EXISTS ( SELECT 1
   FROM documents.document_shares ds
  WHERE ((ds.document_id = documents.id) AND (ds.shared_with_user_id = (select auth.uid())) AND (ds.share_status = 'active'::documents.document_share_status)))))));
alter policy documents_self_or_staff on documents.documents using (((EXISTS ( SELECT 1
   FROM incorporations e
  WHERE ((e.id = documents.case_id) AND (e.user_id = (select auth.uid()))))) OR is_workflow_staff((select auth.uid()))));
alter policy "create own intent" on meetings.booking_intents with check ((user_id = (select auth.uid())));
alter policy "own intents" on meetings.booking_intents using ((user_id = (select auth.uid())));
alter policy order_lines_delete_own_or_admin on orders.order_lines using ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders.orders o
  WHERE ((o.id = order_lines.order_id) AND (o.user_id = (select auth.uid())))))));
alter policy order_lines_insert_own_or_admin on orders.order_lines with check ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders.orders o
  WHERE ((o.id = order_lines.order_id) AND (o.user_id = (select auth.uid())))))));
alter policy order_lines_select_own_or_admin on orders.order_lines using ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders.orders o
  WHERE ((o.id = order_lines.order_id) AND (o.user_id = (select auth.uid())))))));
alter policy order_lines_update_own_or_admin on orders.order_lines using ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders.orders o
  WHERE ((o.id = order_lines.order_id) AND (o.user_id = (select auth.uid()))))))) with check ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders.orders o
  WHERE ((o.id = order_lines.order_id) AND (o.user_id = (select auth.uid())))))));
alter policy orders_insert_own_or_admin on orders.orders with check (((user_id = (select auth.uid())) OR is_admin()));
alter policy orders_select_own_or_admin on orders.orders using (((user_id = (select auth.uid())) OR is_admin()));
alter policy orders_update_own_or_admin on orders.orders using (((user_id = (select auth.uid())) OR is_admin())) with check (((user_id = (select auth.uid())) OR is_admin()));
alter policy payments_select_own_or_admin on orders.payments using ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = (select auth.uid())))))));
alter policy staff_select_all_feedback on public.beta_feedback using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.rol_id)))
  WHERE ((ur.user_id = (select auth.uid())) AND (r.name = ANY (ARRAY['admin'::text, 'gerencia'::text, 'operaciones'::text]))))));
alter policy users_insert_own_feedback on public.beta_feedback with check ((user_id = (select auth.uid())));
alter policy users_select_own_feedback on public.beta_feedback using ((user_id = (select auth.uid())));
alter policy "Users can delete own billing_info" on public.billing_info using (((select auth.uid()) = user_id));
alter policy "Users can insert own billing_info" on public.billing_info with check (((select auth.uid()) = user_id));
alter policy "Users can read own billing_info" on public.billing_info using (((select auth.uid()) = user_id));
alter policy "Users can update own billing_info" on public.billing_info using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Enable users to insert their own data only" on public.companies with check ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));
alter policy "Enable users to update their own data only" on public.companies using ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())))) with check ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));
alter policy "Enable users to view their own data only" on public.companies using ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));
alter policy companies_insert_owner_or_staff on public.companies with check ((is_company_staff() OR (user_id = (select auth.uid()))));
alter policy companies_update_owner_or_staff on public.companies using ((is_company_staff() OR (user_id = (select auth.uid())))) with check ((is_company_staff() OR (user_id = (select auth.uid()))));
alter policy empresas_incorporaciones_insert_owner_or_staff on public.incorporations with check ((is_company_staff() OR (user_id = (select auth.uid()))));
alter policy empresas_incorporaciones_update_owner_or_staff on public.incorporations using ((is_company_staff() OR (user_id = (select auth.uid())))) with check ((is_company_staff() OR (user_id = (select auth.uid()))));
alter policy updete on public.incorporations using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy member_tax_identifications_select on public.member_tax_identifications using ((is_company_staff() OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_tax_identifications.member_id) AND (m.user_id = (select auth.uid())))))));
alter policy "Lectura_solo_referidos" on public.referidos using ((partner_id = (select auth.uid())));
alter policy insertar on public.usuarios with check ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));
alter policy lectura on public.usuarios using ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));
alter policy partner_puede_ver_referidos on public.usuarios using (((user_id = (select auth.uid())) OR (user_id IN ( SELECT referidos.referido_id
   FROM referidos
  WHERE (referidos.partner_id = (select auth.uid()))))));
alter policy update_user on public.usuarios using ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())))) with check ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid()))));
alter policy "Users can read their own notifications" on shared.notifications using (((select auth.uid()) = user_id));
alter policy "Users can update their own notifications" on shared.notifications using (((select auth.uid()) = user_id));
alter policy approvals_staff_select on workflow.approval_records using (workflow.is_workflow_staff((select auth.uid())));
alter policy tasks_staff_or_owner_select on workflow.incorporation_tasks using ((workflow.is_workflow_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM incorporations e
  WHERE ((e.id = incorporation_tasks.incorporation_id) AND (e.user_id = (select auth.uid())))))));
alter policy stages_staff_or_owner_select on workflow.incorporation_workflow_stages using ((workflow.is_workflow_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM (workflow.incorporation_workflows w
     JOIN incorporations e ON ((e.id = w.incorporation_id)))
  WHERE ((w.id = incorporation_workflow_stages.workflow_id) AND (e.user_id = (select auth.uid())))))));
alter policy workflows_staff_or_owner_select on workflow.incorporation_workflows using ((workflow.is_workflow_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM incorporations e
  WHERE ((e.id = incorporation_workflows.incorporation_id) AND (e.user_id = (select auth.uid())))))));
alter policy planning_reports_staff_select on workflow.planning_design_reports using (workflow.is_workflow_staff((select auth.uid())));
alter policy planning_reports_staff_write on workflow.planning_design_reports using (workflow.is_workflow_staff((select auth.uid()))) with check (workflow.is_workflow_staff((select auth.uid())));
alter policy assignments_staff_select on workflow.task_assignment_history using (workflow.is_workflow_staff((select auth.uid())));

-- ============================================================
-- 2. Índices para foreign keys sin cobertura (joins y cascades).
-- ============================================================

create index if not exists audit_events_changed_by_idx on audit_events (changed_by);
create index if not exists billing_info_country_id_idx on billing_info (country_id);
create index if not exists billing_info_state_id_idx on billing_info (state_id);
create index if not exists catalogs_internal_addresses_country_id_idx on catalogs.internal_addresses (country_id);
create index if not exists catalogs_internal_addresses_service_plan_id_idx on catalogs.internal_addresses (service_plan_id);
create index if not exists catalogs_internal_addresses_state_id_idx on catalogs.internal_addresses (state_id);
create index if not exists catalogs_registered_agents_state_id_idx on catalogs.registered_agents (state_id);
create index if not exists catalogs_service_plan_lines_service_id_idx on catalogs.service_plan_lines (service_id);
create index if not exists companies_created_by_idx on companies (created_by);
create index if not exists companies_formation_country_id_idx on companies (formation_country_id);
create index if not exists companies_formation_state_id_idx on companies (formation_state_id);
create index if not exists companies_incorporation_id_idx on companies (incorporation_id);
create index if not exists companies_updated_by_idx on companies (updated_by);
create index if not exists company_addresses_company_id_idx on company_addresses (company_id);
create index if not exists company_addresses_country_id_idx on company_addresses (country_id);
create index if not exists company_addresses_state_id_idx on company_addresses (state_id);
create index if not exists company_members_created_by_idx on company_members (created_by);
create index if not exists company_members_member_id_idx on company_members (member_id);
create index if not exists company_members_updated_by_idx on company_members (updated_by);
create index if not exists company_registered_agents_registered_agent_id_idx on company_registered_agents (registered_agent_id);
create index if not exists documents_document_approvals_approved_by_idx on documents.document_approvals (approved_by);
create index if not exists documents_document_events_actor_user_id_idx on documents.document_events (actor_user_id);
create index if not exists documents_document_links_created_by_idx on documents.document_links (created_by);
create index if not exists documents_document_request_links_created_by_idx on documents.document_request_links (created_by);
create index if not exists documents_document_requests_deleted_by_idx on documents.document_requests (deleted_by);
create index if not exists documents_document_requests_document_type_id_idx on documents.document_requests (document_type_id);
create index if not exists documents_document_requests_requested_by_idx on documents.document_requests (requested_by);
create index if not exists documents_document_shares_revoked_by_user_id_idx on documents.document_shares (revoked_by_user_id);
create index if not exists documents_document_shares_shared_by_user_id_idx on documents.document_shares (shared_by_user_id);
create index if not exists documents_document_templates_created_by_idx on documents.document_templates (created_by);
create index if not exists documents_document_templates_deleted_by_idx on documents.document_templates (deleted_by);
create index if not exists documents_document_templates_updated_by_idx on documents.document_templates (updated_by);
create index if not exists documents_documents_created_by_idx on documents.documents (created_by);
create index if not exists documents_documents_updated_by_idx on documents.documents (updated_by);
create index if not exists documents_documents_uploaded_by_idx on documents.documents (uploaded_by);
create index if not exists incorporations_formation_state_id_idx on incorporations (formation_state_id);
create index if not exists irs_responsible_party_member_id_idx on irs_responsible_party (member_id);
create index if not exists meetings_booking_intents_meeting_id_idx on meetings.booking_intents (meeting_id);
create index if not exists member_tax_identifications_country_id_idx on member_tax_identifications (country_id);
create index if not exists members_country_id_idx on members (country_id);
create index if not exists members_country_nationality_id_idx on members (country_nationality_id);
create index if not exists members_country_residence_id_idx on members (country_residence_id);
create index if not exists members_user_id_idx on members (user_id);
create index if not exists role_permissions_permission_id_idx on role_permissions (permission_id);
create index if not exists states_country_id_idx on states (country_id);
create index if not exists user_roles_user_id_idx on user_roles (user_id);
create index if not exists usuarios_pais_id_idx on usuarios (pais_id);
create index if not exists usuarios_referido_por_idx on usuarios (referido_por);
create index if not exists workflow_approval_records_decided_by_idx on workflow.approval_records (decided_by);
create index if not exists workflow_incorporation_forms_validated_by_idx on workflow.incorporation_forms (validated_by);
create index if not exists workflow_incorporation_forms_workflow_task_id_idx on workflow.incorporation_forms (workflow_task_id);
create index if not exists workflow_incorporation_workflow_stages_stage_id_idx on workflow.incorporation_workflow_stages (stage_id);
create index if not exists workflow_planning_design_reports_activity_id_idx on workflow.planning_design_reports (activity_id);
create index if not exists workflow_planning_design_reports_created_by_idx on workflow.planning_design_reports (created_by);
create index if not exists workflow_planning_design_reports_state_id_idx on workflow.planning_design_reports (state_id);
create index if not exists workflow_workflow_stage_plan_applicability_plan_id_idx on workflow.workflow_stage_plan_applicability (plan_id);

-- ============================================================
-- 3. search_path fijo en funciones (mitiga search_path hijacking).
-- ============================================================

alter function public.check_billing_info_limit() set search_path = public;
alter function public.ensure_single_default_billing() set search_path = public;
alter function public.generate_unique_partner_code(code_len integer) set search_path = public;
alter function public.is_audit_reader() set search_path = public;
alter function public.is_company_staff() set search_path = public;
alter function public.jwt_has_any_role(role_names text[]) set search_path = public;
alter function public.jwt_has_role(role_name text) set search_path = public;
alter function public.set_partner_code_on_user_role_change() set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- ============================================================
-- 4. Índices duplicados: la unique constraint replica la PK.
--    Ninguna FK depende de ellas (verificado en pg_constraint).
-- ============================================================

alter table public.usuarios drop constraint if exists usuarios_user_id_key;
alter table catalogs.service_plan_lines drop constraint if exists service_plan_lines_plan_service_key;
