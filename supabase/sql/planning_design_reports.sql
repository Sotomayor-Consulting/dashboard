-- ═══════════════════════════════════════════════════════════════
-- Planning & Design report — rediseño de la etapa planning_meeting
-- ───────────────────────────────────────────────────────────────
-- Aplicado vía migración `planning_design_reports_setup`.
-- La etapa ya NO requiere aprobación del cliente. Operaciones llena
-- un wizard cuyos datos se guardan en workflow.planning_design_reports
-- y alimentan la plantilla Carbone para generar el informe (PDF),
-- que se sube como client_visible (sin aprobación).
-- ═══════════════════════════════════════════════════════════════

-- ─── Tabla de datos del informe (1:1 con la incorporación) ──────
create table if not exists workflow.planning_design_reports (
	id                  uuid primary key default gen_random_uuid(),
	incorporation_id    uuid not null unique
		references public.empresas_incorporaciones(empresa_incorporacion_id) on delete cascade,
	task_id             uuid
		references workflow.incorporation_tasks(id) on delete set null,

	-- Catálogos
	-- state_id repuntado de public.estados → public.states en la migración
	-- `planning_design_reports_state_fk_to_states` (consolidación de catálogos).
	state_id            integer references public.states(id),
	activity_id         integer references public.activity(id),

	-- Datos del informe (enums controlados en el form → CHECK en DB)
	confidentiality     boolean,
	administration_form text check (administration_form in ('member_managed','manager_managed')),
	tax_tributation     text check (tax_tributation in ('pass_through','corporation')),
	accounting_method   text check (accounting_method in ('cash','accrual')),
	members_number      integer check (members_number is null or members_number >= 0),
	income_us           boolean,
	designated_manager  text,
	company_description text,
	meeting_resume      text,

	created_by          uuid references auth.users(id),
	created_at          timestamptz not null default now(),
	updated_at          timestamptz not null default now()
);

create index if not exists planning_design_reports_task_idx
	on workflow.planning_design_reports (task_id);

drop trigger if exists set_updated_at on workflow.planning_design_reports;
create trigger set_updated_at
	before update on workflow.planning_design_reports
	for each row execute function public.set_updated_at();

-- ─── RLS: solo staff (admin/operaciones) ───────────────────────
alter table workflow.planning_design_reports enable row level security;

drop policy if exists planning_reports_staff_select on workflow.planning_design_reports;
create policy planning_reports_staff_select
	on workflow.planning_design_reports for select
	to authenticated
	using (workflow.is_workflow_staff(auth.uid()));

drop policy if exists planning_reports_staff_write on workflow.planning_design_reports;
create policy planning_reports_staff_write
	on workflow.planning_design_reports for all
	to authenticated
	using (workflow.is_workflow_staff(auth.uid()))
	with check (workflow.is_workflow_staff(auth.uid()));

grant select, insert, update, delete on workflow.planning_design_reports to authenticated;

-- ─── Catálogo de etapa 1: sin aprobación, auto-avanza ──────────
update workflow.workflow_stage_catalog
set requires_approval = false, approval_role = null, auto_advance = true
where id = 1;

-- ─── Plantillas de tareas (stage 1) ────────────────────────────
update workflow.task_templates set title = 'Llenar informe de planificación'
where id = 2 and stage_id = 1;

-- Aprobación del cliente: desactivada (comentada), no se elimina
update workflow.task_templates set is_active = false
where id = 3 and stage_id = 1;

insert into workflow.task_templates
	(stage_id, title, description, default_assigned_role, default_priority, display_order, is_active)
select 1, 'Enviar informe',
	'Genera el informe de planificación y diseño desde la plantilla y lo sube al cliente.',
	'operations', 'normal', 3, true
where not exists (
	select 1 from workflow.task_templates where stage_id = 1 and title = 'Enviar informe'
);

-- ─── Backfill de workflows en curso (etapa 1 in_progress) ──────
-- 1) Añadir "Enviar informe"
with newtpl as (
	select id from workflow.task_templates where stage_id=1 and title='Enviar informe'
),
target_stages as (
	select s.id as stage_id, w.incorporation_id
	from workflow.incorporation_workflow_stages s
	join workflow.incorporation_workflows w on w.id = s.workflow_id
	where s.stage_id = 1 and s.status = 'in_progress'
)
insert into workflow.incorporation_tasks
	(workflow_stage_id, incorporation_id, template_task_id, title, description,
	 status, priority, assigned_role, display_order)
select ts.stage_id, ts.incorporation_id, nt.id, 'Enviar informe',
	'Genera el informe de planificación y diseño desde la plantilla y lo sube al cliente.',
	'pending', 'normal', 'operations', 3
from target_stages ts cross join newtpl nt
where not exists (
	select 1 from workflow.incorporation_tasks t
	where t.workflow_stage_id = ts.stage_id and t.title = 'Enviar informe'
);

-- 2) Renombrar tarea #2 en curso
update workflow.incorporation_tasks t
set title = 'Llenar informe de planificación', updated_at = now()
from workflow.incorporation_workflow_stages s
where t.workflow_stage_id = s.id and s.stage_id = 1 and s.status = 'in_progress'
	and t.template_task_id = 2;

-- 3) Cancelar aprobación del cliente (no completada) en curso
update workflow.incorporation_tasks t
set status = 'cancelled', updated_at = now()
from workflow.incorporation_workflow_stages s
where t.workflow_stage_id = s.id and s.stage_id = 1 and s.status = 'in_progress'
	and t.template_task_id = 3 and t.status not in ('completed');
