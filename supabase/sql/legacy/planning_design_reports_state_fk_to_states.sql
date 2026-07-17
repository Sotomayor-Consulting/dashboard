-- ═══════════════════════════════════════════════════════════════
-- Re-point planning_design_reports.state_id  FK: estados → states
-- ───────────────────────────────────────────────────────────────
-- Aplicado vía migración `planning_design_reports_state_fk_to_states`.
--
-- Contexto: consolidación de catálogos. La tabla legacy public.estados
-- (PK `ListaDeEstados_Id` bigint) se va a ELIMINAR. El único objeto que
-- dependía de ella era esta FK, lo que bloqueaba el DROP:
--
--   ERROR 2BP01: cannot drop table estados because other objects depend on it
--   DETAIL: constraint planning_design_reports_state_id_fkey ... depends on estados
--
-- public.states (PK `id` integer) es el catálogo nuevo al que ya apuntan
-- companies, company_addresses y empresas_incorporaciones.
--
-- Seguridad de datos: workflow.planning_design_reports está VACÍA (0 filas)
-- al momento de esta migración, por lo que NO hay valores que remapear.
-- ⚠ Si en el futuro hubiera filas, los ids NO coinciden entre catálogos
--   (p. ej. Arizona = 3 en estados vs 4 en states): habría que remapear
--   por clave natural (nombre/abreviatura) ANTES de soltar la FK. Ver
--   bloque comentado al final.
-- ═══════════════════════════════════════════════════════════════

begin;

-- 1) Soltar la FK vieja hacia public.estados
alter table workflow.planning_design_reports
	drop constraint if exists planning_design_reports_state_id_fkey;

-- 2) Alinear el tipo de la columna con states.id (integer).
--    Seguro porque la tabla está vacía; states.id es int4, no int8.
alter table workflow.planning_design_reports
	alter column state_id type integer using state_id::integer;

-- 3) Recrear la FK apuntando a public.states(id)
alter table workflow.planning_design_reports
	add constraint planning_design_reports_state_id_fkey
	foreign key (state_id) references public.states(id);

commit;

-- ───────────────────────────────────────────────────────────────
-- Después de esto, el DROP de la tabla legacy ya no está bloqueado:
--   drop table public.estados;
-- ───────────────────────────────────────────────────────────────

-- ── Remapeo (SOLO si la tabla tuviera filas; aquí innecesario) ──
-- Ejecutar ENTRE el paso 1 y el paso 3, con la FK ya soltada:
--
-- update workflow.planning_design_reports r
-- set state_id = s.id
-- from public.estados e
-- join public.states s
--   on lower(trim(s.name)) = lower(trim(e."Estado"))
--   or upper(trim(s.code)) = upper(trim(e.abreviatura))
-- where r.state_id = e."ListaDeEstados_Id"
--   and s.country_id = 75;  -- EE.UU.
--
-- Verificar huérfanos antes del paso 3:
--   select distinct state_id from workflow.planning_design_reports
--   where state_id is not null
--     and state_id not in (select id from public.states);
