# Plan de implementación — Modelo de Companies (direcciones, agente residente, responsible party, tax ids)

**Proyecto:** DASHBOARD-TEST (`ceuofnjslxjoqtqxbfqt`) · Postgres 17
**Alcance:** evolución del modelo de empresas en la DB **viva** (dashboard-alpha-v1). NO greenfield.
**Estado:** MODELO CERRADO (board Miro "Desarrollo de Aplicación SCI" · diagrama "Diagrama de relaciones de entidades") — plan por **fases de menor a mayor impacto en la aplicación**.
**Relación:** este plan es de **esquema/modelo**. El [data-migration-plan.md](data-migration-plan.md) (carga Cognito/Odoo→DB) es independiente; convergen en las mismas tablas.

---

## 0. Decisiones cerradas

| # | Decisión | Elección |
|---|---|---|
| A | Enums de `members` | **Se corrigen en Supabase** hacia los valores del board: `person_type = individual \| entity` (rename de `natural_person`/`juridical_person`); `identification_type = passport \| drivers_license \| id \| ein` (rename `driver_licence`→`drivers_license`, `national_id`→`id`). ⚠️ El board tiene typo `drivers_licence` — el valor canónico es **`drivers_license`**. |
| B | Mailing de empresa | Por **enum** `company_address_type` (`operational \| mailing \| ein_request \| other`), NO segundo puntero. Solo `principal_address_id` es puntero en `companies`. |
| C | Schema move `public.*` → `companies.*`/`catalogs.*` | **DIFERIDO** (Fase 8 opcional). El board dibuja los schemas destino; las Fases 1–7 se ejecutan **en `public`** (los catálogos nuevos sí nacen en `catalogs`, que ya existe y está expuesto). |
| D | "Activo" | Doble eje: `start_date`/`end_date` = **vigencia legal** (vigente ⇔ `end_date is null`); `is_active` = **archivo/visibilidad** en el front, previo al hard delete. Hard delete solo con fila archivada y sin referencias (`ON DELETE RESTRICT`). |
| E | Respaldo de borrado | `audit_events` guarda snapshot (`recordAuditEvent`); NO se agregan columnas de soft-delete (`deleted_at/deleted_by/delete_reason` no van — el código que las asume se corrige, Fase 4). |
| F | PKs | uuid = aggregate roots (companies, members, incorporations, company_registered_agents); bigint = tablas hijas y catálogos. FKs geográficos = **int** (countries.id/states.id son integer). |
| G | `public.incorporations` | **FUERA DE ALCANCE por ahora** (pedido explícito 2026-07-09). No se toca la tabla en ninguna fase: ni renames (`state`→`register_state`), ni tipos (`updated_at`→timestamptz), ni `entity_type` enum. Se retomará como fase propia cuando se autorice. |

---

## 1. Modelo final (referencia)

### 1.1 Catálogo (schema `catalogs`, ya existe y expuesto)

```
catalogs.registered_agent_providers        -- proveedor comercial de RA
  id bigint pk · name text · website text N · email text N
  is_active bool default true · created_at/updated_at timestamptz

catalogs.registered_agents                 -- presencia del proveedor por estado
  id bigint pk · provider_id bigint fk → providers · state_id int fk → public.states
  agent_name text · line1 · line2 N · city · zip
  is_active bool default true · created_at/updated_at timestamptz
  unique(provider_id, state_id)

catalogs.internal_addresses                -- direcciones que SCI ofrece a clientes
  id bigint pk · type internal_addresses_type (mailing|ein_request|virtual_address|other)
  country_id int fk · state_id int fk · city text · county text N
  line1 · line2 N · zip · service_plan_id bigint fk N → catalogs.service_plans
  is_active bool default true · created_at/updated_at timestamptz
```

### 1.2 Empresas (en `public` hasta Fase 8)

```
company_registered_agents                  -- asignación empresa↔agente con vigencia
  id uuid pk · company_id uuid fk → companies
  registered_agent_id bigint fk N → catalogs.registered_agents
  full_legal_name text N        -- solo caso custom (agente propio del cliente)
  custom_address jsonb N        -- forma: {country_id, state_id, county, city, line1, line2, zip}
  start_date date · end_date date N · created_at/updated_at timestamptz
  unique(company_id) where end_date is null      -- un agente vigente por empresa

irs_responsible_party                      -- rol del responsible party del EIN (8822-B)
  id bigint pk
  (company_id, member_id) fk compuesta → company_members(company_id, member_id)
  title text · start_date date · end_date date N · created_at/updated_at timestamptz
  unique(company_id) where end_date is null      -- un responsible party activo

member_tax_identifications                -- 1 member → N identificaciones fiscales
  id bigint pk · member_id uuid fk → members
  type member_tax_identification_type (ssn|itin|ein|foreign)
  number text · country_id int fk N → countries
  is_active bool default true · is_primary bool default false N
  created_at/updated_at timestamptz
  unique(member_id, type)
```

### 1.3 Modificaciones a tablas existentes

```
companies
  + principal_address_id bigint fk N → company_addresses   (ON DELETE RESTRICT)
  - irs_email            (tras backfill, Fase 7)

company_addresses        (RLS hoy DENY-ALL — se arregla en Fase 4)
  + start_date date · end_date date N        (vigencia legal)
  + internal_address_id bigint fk N → catalogs.internal_addresses
      -- lleno ⇒ dirección provista por SCI; line1/city/etc quedan null (fuente = catálogo)
  + included_in_plan bool default false
  + is_active bool default true              (archivo, Decisión D)
  ~ company_id set not null
  ~ enum company_address_type: + 'mailing', + 'ein_request'
  + POLICIES RLS (select: user_can_access_company; write: is_company_staff)
  + unique(company_id, type) where end_date is null

member_addresses
  - state text            (redundante con state_id)
  ~ type text → enum member_address_type (residential|mailing|business|other)

members
  ~ enum person_type:        rename natural_person→individual · juridical_person→entity
  ~ enum identification_type: rename driver_licence→drivers_license · national_id→id
  - ssn · itin · identification_type · identification_number   (tras backfill, Fase 7)

company_members            (sin cambio estructural: id bigint + unique(company_id,member_id) ya existen)
```

---

## 2. Bugs preexistentes que el plan corrige de paso

1. **`domains/companies/addresses.ts`** filtra `.is('deleted_at', null)` sobre columnas inexistentes → toda lectura falla `42703`. Además `company_addresses` tiene RLS activo **sin policies** (deny-all). La feature de direcciones está caída. → **Fase 4** la revive.
2. **`domains/members/people.ts`** (`MEMBER_COLUMNS`) selecciona `full_name`, `is_member`, `is_manager` que no existen en `members` → `searchMembers`/`getMemberById` rotos. → **Fase 6** lo corrige.

---

## 3. Fases de ejecución — de menor a mayor impacto en la aplicación

> **ESTADO DE EJECUCIÓN (2026-07-09):**
> - ✅ **F1 EJECUTADA** — migraciones `create_registered_agents_catalog`, `create_internal_addresses_catalog`. Seed PENDIENTE (faltan datos reales de proveedores/direcciones SCI).
> - ✅ **F2 EJECUTADA** — migraciones `create_company_registered_agents`, `create_member_tax_identifications` (backfill 2/2 ✓, ambos `identification_number`→tipo inferido), `create_irs_responsible_party` (incluyó el prerequisito `unique(company_id, member_id)` en `company_members`, que NO existía — solo tenía PK `id`).
> - ⚠️ **Excepción de backfill responsible party:** `companies` "119 EMPRESA TEST" (`805d1026-…`) tiene `irs_email=test@test.com` sin member que coincida → sin fila creada (data de prueba; resolver o ignorar antes de F5).
> - ✅ Gates verificados: conteos backfill OK; 14 policies RLS creadas; invariante "un agente vigente por empresa" probada con smoke test (unique_violation + rollback).
> - 🔶 **F3 BACKEND EJECUTADO (2026-07-09)** — domains: `domains/catalogs/registered-agents.ts`, `domains/catalogs/internal-addresses.ts`, `domains/companies/registered-agents.ts`, `domains/companies/responsible-party.ts`, `domains/members/tax-identifications.ts`; schemas Zod: `modules/companies/schemas/compliance.schema.ts`; helper `requireAuthenticated` en `@shared/api/company-data`; API routes: `api/companies/[companyId]/registered-agent.ts` (GET/POST/DELETE), `api/companies/[companyId]/responsible-party.ts` (GET/POST/DELETE), `api/members/[memberId]/tax-identifications/*` (GET/POST/DELETE-archive), `api/catalogs/registered-agents.ts` (GET/POST provider|agent), `api/catalogs/internal-addresses/*` (GET/POST/PATCH/DELETE-archive). `astro check` limpio. **PENDIENTE de F3: UI** (selector de agente en detalle de empresa, CRUD admin de catálogos, panel responsible party, lista tax ids).
> - 🔶 **Vista cliente "Empresa" creada (2026-07-09)** — `modules/companies/CompanyClientView.astro` + `services/get-company-client-view-data.ts` + paneles Socios/Direcciones/Documentos (página `my-companies/[incorporationId]/company.astro` ahora thin). Usa `supabaseAdmin` tras check de ownership porque `company_members`/`members`/`company_addresses` no tienen SELECT para clientes — **al ejecutar F4, migrar este agregador a RLS** (quitar supabaseAdmin). Ya consume los dominios F3 (agente registrado + responsible party).
> - ⏭️ Siguiente: UI admin de F3 (asignar agente, CRUD catálogos), luego **F4** (direcciones).

> Regla de avance: cada fase tiene **gate de salida**; no se pasa a la siguiente sin verificarlo. Las fases 1–3 son reversibles con un simple `DROP` (nada las consume); a partir de la 4 hay cutover de código.

### FASE 0 — Preparación (impacto en app: NINGUNO)

- Correcciones cosméticas del board: `member_tax_identifications.country_id` bigint→**int** FK; typo `drivers_licence`→`drivers_license`; anotar Decisión D junto a `company_addresses`.
- (Opcional) Generar DBML consolidado como fuente única del DDL.
- **Gate:** board == §1 de este documento.

### FASE 1 — Catálogos nuevos (impacto en app: NINGUNO — solo DB, aditivo)

- **Migraciones:** `M1 create_registered_agents_catalog` (providers + agents + RLS: SELECT authenticated, write staff) · `M2 create_internal_addresses_catalog` (+ enum `internal_addresses_type` + RLS).
- **Seed:** proveedores/agentes actuales de SCI y las direcciones internas reales (la de recepción del CP575, virtual address, etc.).
- **Código tocado:** ninguno.
- **Rollback:** `DROP TABLE` sin consecuencias.
- **Gate:** filas seed visibles vía REST con rol staff; anon/cliente sin acceso de escritura.

### FASE 2 — Tablas de asignación + backfills (impacto en app: NINGUNO — columnas legacy siguen vivas)

- **Migraciones:** `M3 create_company_registered_agents` · `M4 create_member_tax_identifications` + backfill desde `members.ssn/itin/identification_number` (type inferido: ssn→ssn, itin→itin, identification_type='ein'→ein, resto→foreign) · `M5 create_irs_responsible_party` + backfill desde `companies.irs_email` (match por email del member; no resueltos → reporte de excepciones).
- **Importante:** NO se dropea nada; `members.ssn/itin/*` y `companies.irs_email` siguen siendo lo que la app lee/escribe. Cero cambio de comportamiento.
- **Código tocado:** ninguno.
- **Rollback:** `DROP TABLE`.
- **Gate:** conteo backfill tax ids == valores no nulos de origen; cada `irs_email` → fila o en reporte; insertar 2º responsible party/agente activo → falla por unique parcial.

### FASE 3 — Features net-new (impacto en app: BAJO — solo código aditivo, nada existente cambia)

- **Código nuevo (patrón `addresses.ts`):** `domains/companies/registered-agents.ts` · `domains/members/tax-identifications.ts` · `domains/companies/responsible-party.ts` + API routes + UI: asignar/terminar agente residente (con opción custom), CRUD admin de `catalogs.internal_addresses`, panel responsible party (lectura desde la tabla nueva), lista de tax ids del member.
- **Regla técnica:** catálogos con `.schema('catalogs')`; joins hacia `public.states`/`countries` por lookup+join JS (gotcha PostgREST de embeds cross-schema).
- **Riesgo:** bajo — ninguna pantalla existente se modifica; features nuevas detrás de sus propias rutas.
- **Gate:** E2E de asignación de agente (catálogo y custom) y CRUD de direcciones internas; `astro check` limpio.

### FASE 4 — Direcciones de empresa (impacto: MEDIO — arregla feature HOY CAÍDA; primer cutover de código)

- **Migraciones:** `M6 alter_company_address_type_enum` (`ADD VALUE 'mailing'`, `'ein_request'` — migración aparte: ADD VALUE no es transaccional con su uso) · `M7 fix_company_addresses` (columnas §1.3 + `company_id not null` + POLICIES + uniques + `companies.principal_address_id`).
- **Código:** reescribir `domains/companies/addresses.ts` (eliminar ramas `deleted_at`/`isMissingCompanyIdColumn`; archivo=`is_active`, vigencia=`end_date`; **un solo resolver por rol** que haga coalesce columnas propias vs `internal_address_id`→catálogo); unificar `use-company-addresses.ts`/`use-member-addresses.ts` en hook parametrizado; UI con alerta "irreversible" para hard delete de archivadas; exponer `principal_address_id` en `company-info.ts` y detalle de empresa.
- **Riesgo:** medio pero asimétrico — la feature está rota hoy (deny-all + columna fantasma), solo puede mejorar.
- **Gate:** dueño autenticado ve/crea/edita/archiva direcciones E2E (hoy imposible); dirección interna resuelve datos del catálogo; ajeno → 0 filas; principal asignable y protegida (`RESTRICT`).

### FASE 5 — Cutover responsible party (impacto: MEDIO — repuntar lecturas/escrituras existentes)

- **Código:** `InformationPanel.astro` y cualquier lectura de `companies.irs_email` → leer de `irs_responsible_party` (join a member para nombre/email; TIN desde `member_tax_identifications`). Dejar de **escribir** `irs_email` (formularios/save de incorporación si aplica). La columna queda congelada hasta Fase 7.
- **Riesgo:** medio — toca vistas existentes, pero la tabla ya está poblada y verificada desde Fase 2.
- **Gate:** panel de empresa muestra el responsible party correcto para las empresas con backfill; cambiar el responsible party (cerrar vigencia + nueva fila) refleja en UI.

### FASE 6 — Cutover members: enums + tax ids (impacto: ALTO — release coordinado DB+código)

- **Migración:** `M8 rename_member_enums` (4 × `ALTER TYPE … RENAME VALUE`). Sin migración de datos (rename es in-place), pero **rompe el código viejo al instante** → deploy del código en el mismo release.
- **Código:** `domains/members/people.ts` — `MemberPersonType = 'individual'|'entity'`, `MemberIdentificationType` nuevos valores, quitar `ssn/itin/identification_*` de `MemberRow`/`MEMBER_COLUMNS`/payload (**incluye el fix de columnas fantasma** `full_name/is_member/is_manager`); forms/islands de member escriben tax ids vía `member-tax-identifications` (doble escritura NO necesaria: desde aquí la tabla nueva es la única que se escribe); lecturas de ssn/itin (plantillas de documentos, transformers) → nuevo domain.
- **Riesgo:** alto — enum rename + columnas de member usadas por forms e islands. Ventana de deploy única, smoke test inmediato.
- **Gate:** `searchMembers`/`getMemberById` funcionan (hoy rotos); alta/edición de member E2E con enums nuevos; generación de documentos que usaba ssn/itin intacta.

### FASE 7 — Limpieza y drops (impacto: BAJO si F4–F6 verificadas)

- **Migraciones:** `M9 cleanup_member_addresses` (drop `state` text; `type`→enum — verificar mapeo de las filas existentes) · `M10 drop_migrated_columns` (drop `members.ssn/itin/identification_type/identification_number` + `companies.irs_email`).
- **Código:** `domains/members/member-addresses.ts` sin `state` text.
- **Regla:** ejecutar solo tras ≥1 ciclo de uso real de F5/F6 sin incidencias.
- **Gate:** `astro check` limpio; grep sin referencias a columnas dropeadas; flujo incorporación + checkout intactos.

### FASE 8 — (OPCIONAL, DIFERIDA) Schema move `public.*` → `companies.*` (impacto: MÁXIMO)

- 39 archivos `.from()` → `.schema('companies')` + rework de embeds cross-schema (receta orders: denormalizar / vistas `security_invoker` / lookup+join JS) + agregar `companies` a Exposed Schemas + re-crear RLS.
- **Emprender solo con justificación** (orden del schema por sí solo no paga el costo). Si se hace: por dominio, con vistas puente temporales.

---

## 4. Resumen de impacto por área (Fases 1–7)

| Área | Archivos representativos | Fase | Riesgo |
|---|---|---|---|
| Catálogos RA / direcciones internas | — (net-new) | 1–3 | Nulo/Bajo |
| Asignación de agente / tax ids / responsible party (tablas) | — (net-new) | 2–3 | Nulo/Bajo |
| Direcciones empresa | `domains/companies/addresses.ts` · `api/companies/[companyId]/addresses/*` · `api/incorporations/[incorporationId]/addresses/*` · `modules/companies/components/company-addresses/*` · hooks | 4 | Medio (hoy roto) |
| Direcciones socio | `domains/members/member-addresses.ts` · `MemberAddressesPanel.tsx` · hooks | 4 y 7 | Medio |
| Responsible party (consumo) | `InformationPanel.astro` + escrituras `irs_email` | 5 | Medio |
| Members / tax ids (consumo) | `domains/members/people.ts` · islands/forms de member · transformers de documentos | 6 | Alto |
| Companies core | `companies.ts` · `company-info.ts` · `get-company-*-data.ts` | 4 | Bajo |
| Sin impacto | `incorporations` (delgada) · `company_members` · workflow/orders/documents | — | — |

---

## 4.0 Separación de rutas incorporations/companies (2026-07-09) — HECHO

Las rutas del cliente estaban 100% keyed por `incorporationId` → una empresa sin incorporación era inalcanzable (404). Cambios: `EmpresaSwitcherItem` ahora lleva `incorporation_id` y `company_id` separados y `getEmpresasForSwitcher` lista la **unión** incorporations ∪ companies del usuario; nueva ruta canónica de empresa `/my-companies/company/[companyId]` (CompanyClientView keyed por companyId, ownership vía RLS de companies); la ruta legacy `/my-companies/[incorporationId]/company` redirige a la canónica (o muestra "no constituida"); items del sidebar condicionales (Incorporación solo si hay proceso, Empresa solo si hay company); `set-active` valida el id contra ambas tablas; `LayoutSidebar` resuelve la empresa activa desde ambas formas de URL.

## 4.1 Hallazgo de datos (2026-07-09) — ownership duplicado

Bug real encontrado: `companies.user_id` ≠ `incorporations.user_id` en EMPANADA LLC → la empresa no aparecía en el menú (el switcher lista `incorporations` por user_id). Corregido por data-fix (alineado a jeff@rios.com). **Pendiente estructural** (candidato a fase futura): (a) derivar el switcher/menú "Empresa" desde `companies` (canónica) en vez de `incorporations`; (b) check de integridad para divergencia de owners entre ambas tablas. PEPE1 (incorporación Activa sin fila en companies, anterior al fix de createCompanyFromIncorporation) se deja como data de prueba.

## 5. Pendiente en el board (cosmético — es la Fase 0)

- `member_tax_identifications.country_id`: bigint → **int** FK→countries.
- Typo enum: `drivers_licence` → `drivers_license`.
- Anotar Decisión D (vigencia vs archivo) junto a `company_addresses`.
