-- Hardening de permisos de funciones SECURITY DEFINER.
-- `db pull` no exporta ACLs, así que production quedó con los defaults de
-- Postgres (EXECUTE para PUBLIC → anon podía invocar 37 funciones vía RPC).
-- Este DDL replica los grants exactos de development: todo se revoca y solo
-- se restaura authenticated / supabase_auth_admin donde corresponde
-- (service_role y postgres conservan acceso por sus grants de rol).

revoke all on function documents.auto_share_on_client_visible() from public, anon, authenticated;
revoke all on function meetings.get_workflow_meeting(p_incorporation_id uuid) from public, anon, authenticated;
grant execute on function meetings.get_workflow_meeting(p_incorporation_id uuid) to authenticated;
revoke all on function meetings.upsert_planning_meeting(p_zcal_event_id character varying, p_user_id uuid, p_advisor_email character varying, p_title character varying, p_scheduled_at timestamp with time zone, p_duration_minutes integer, p_is_cancelled boolean, p_platform character varying, p_meeting_url text, p_meeting_external_id character varying, p_meeting_passcode character varying, p_incorporation_id uuid) from public, anon, authenticated;
revoke all on function meetings.upsert_planning_meeting(p_zcal_event_id character varying, p_user_id uuid, p_advisor_email character varying, p_title character varying, p_scheduled_at timestamp with time zone, p_duration_minutes integer, p_is_cancelled boolean, p_platform character varying, p_meeting_url text, p_meeting_external_id character varying, p_meeting_passcode character varying, p_incorporation_id uuid, p_is_workflow boolean) from public, anon, authenticated;
revoke all on function orders.is_staff() from public, anon, authenticated;
grant execute on function orders.is_staff() to authenticated;
revoke all on function orders.trg_order_confirmed_cancel_stale() from public, anon, authenticated;
revoke all on function orders.trg_payment_succeeded_workflow() from public, anon, authenticated;
revoke all on function public.apply_referral_code(p_user_id uuid, p_code text) from public, anon, authenticated;
grant execute on function public.apply_referral_code(p_user_id uuid, p_code text) to authenticated;
revoke all on function public.crear_nuevo_usuario() from public, anon, authenticated;
revoke all on function public.create_booking_intent(p_user_id uuid, p_incorporation_id uuid, p_category character varying) from public, anon, authenticated;
revoke all on function public.create_notification_on_empresa_insert() from public, anon, authenticated;
revoke all on function public.create_workflow_for_incorporation(p_incorporation_id uuid, p_plan_id integer) from public, anon, authenticated;
revoke all on function public.custom_access_token_hook(event jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(event jsonb) to supabase_auth_admin;
revoke all on function public.empresas_incorporaciones_notify_porcentaje() from public, anon, authenticated;
revoke all on function public.force_logout_user(target_user_id uuid) from public, anon, authenticated;
revoke all on function public.get_user_id_by_email(p_email text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(p_email text) to authenticated;
revoke all on function public.get_workflow_meeting(p_incorporation_id uuid) from public, anon, authenticated;
grant execute on function public.get_workflow_meeting(p_incorporation_id uuid) to authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_workflow_staff(p_uid uuid) from public, anon, authenticated;
grant execute on function public.is_workflow_staff(p_uid uuid) to authenticated;
revoke all on function public.mark_pago_visto_secure(p_id uuid) from public, anon, authenticated;
grant execute on function public.mark_pago_visto_secure(p_id uuid) to authenticated;
revoke all on function public.notifications_broadcast() from public, anon, authenticated;
revoke all on function public.notifications_broadcast_trigger() from public, anon, authenticated;
revoke all on function public.notify_empresa_activa_form() from public, anon, authenticated;
revoke all on function public.procesar_orden_odoo(p_user_id uuid, p_odoo_partner_id bigint, p_odoo_invoice_id bigint, p_odoo_sale_order_id bigint, p_servicio_template_id bigint, p_monto numeric, p_perfil jsonb) from public, anon, authenticated;
revoke all on function public.referrals_by_day(p_partner uuid, p_from date, p_to date) from public, anon, authenticated;
grant execute on function public.referrals_by_day(p_partner uuid, p_from date, p_to date) to authenticated;
revoke all on function public.registrar_pago_desde_stripe(p_payment_intent jsonb) from public, anon, authenticated;
revoke all on function public.upsert_planning_meeting(p_zcal_event_id character varying, p_user_id uuid, p_advisor_email character varying, p_title character varying, p_scheduled_at timestamp with time zone, p_duration_minutes integer, p_is_cancelled boolean, p_platform character varying, p_meeting_url text, p_meeting_external_id character varying, p_meeting_passcode character varying, p_incorporation_id uuid) from public, anon, authenticated;
revoke all on function public.upsert_planning_meeting(p_zcal_event_id character varying, p_user_id uuid, p_advisor_email character varying, p_title character varying, p_scheduled_at timestamp with time zone, p_duration_minutes integer, p_is_cancelled boolean, p_platform character varying, p_meeting_url text, p_meeting_external_id character varying, p_meeting_passcode character varying, p_incorporation_id uuid, p_is_workflow boolean) from public, anon, authenticated;
revoke all on function public.user_can_access_company(p_company_id uuid) from public, anon, authenticated;
grant execute on function public.user_can_access_company(p_company_id uuid) to authenticated;
revoke all on function public.user_can_access_incorporation(p_incorporation_id uuid) from public, anon, authenticated;
grant execute on function public.user_can_access_incorporation(p_incorporation_id uuid) to authenticated;
revoke all on function public.workflow_advance_stage(p_workflow_id uuid) from public, anon, authenticated;
grant execute on function public.workflow_advance_stage(p_workflow_id uuid) to authenticated;
revoke all on function public.workflow_client_snapshot(p_incorporation_id uuid) from public, anon, authenticated;
grant execute on function public.workflow_client_snapshot(p_incorporation_id uuid) to authenticated;
revoke all on function public.workflow_complete_task(p_task_id uuid, p_user_id uuid) from public, anon, authenticated;
grant execute on function public.workflow_complete_task(p_task_id uuid, p_user_id uuid) to authenticated;
revoke all on function public.workflow_record_approval(p_stage_id uuid, p_decision text, p_comments text, p_user_id uuid) from public, anon, authenticated;
grant execute on function public.workflow_record_approval(p_stage_id uuid, p_decision text, p_comments text, p_user_id uuid) to authenticated;
revoke all on function workflow.append_missing_stages_for_plan(p_incorporation_id uuid, p_plan_id integer) from public, anon, authenticated;
revoke all on function workflow.create_workflow_for_incorporation(p_incorporation_id uuid, p_plan_id integer) from public, anon, authenticated;
revoke all on function workflow.is_workflow_staff(p_user uuid) from public, anon, authenticated;
grant execute on function workflow.is_workflow_staff(p_user uuid) to authenticated;
revoke all on function workflow.reset_stage(p_stage_id uuid, p_reset_by uuid) from public, anon, authenticated;
grant execute on function workflow.reset_stage(p_stage_id uuid, p_reset_by uuid) to authenticated;

-- Evita que futuras funciones en estos schemas nazcan ejecutables por PUBLIC.
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema documents revoke execute on functions from public;
alter default privileges for role postgres in schema workflow revoke execute on functions from public;
alter default privileges for role postgres in schema orders revoke execute on functions from public;
alter default privileges for role postgres in schema meetings revoke execute on functions from public;
alter default privileges for role postgres in schema shared revoke execute on functions from public;
alter default privileges for role postgres in schema catalogs revoke execute on functions from public;
