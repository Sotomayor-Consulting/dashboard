# Plan de Estandarización: Tablas Legacy Español → Inglés

**Proyecto:** DASHBOARD-TEST (`ceuofnjslxjoqtqxbfqt`)
**Fecha:** 2026-06-10
**Estado:** PLAN — No ejecutar sin revisión

---

## Estrategia

Cada tabla sigue el mismo patrón:
1. `ALTER TABLE RENAME TO` (nueva tabla inglés)
2. `ALTER TABLE RENAME COLUMN` para cada columna en español
3. `CREATE VIEW` con el nombre viejo (compatibilidad temporal)
4. Recrear RLS policies sobre el nombre nuevo
5. Actualizar funciones PL/pgSQL que referencian nombres viejos

Las vistas de compatibilidad permiten que el código existente siga funcionando mientras se actualizan los `.from('tabla')` por dominio. Una vez que el grep del código no devuelva el nombre viejo, se elimina la vista.

---

## Fase 0 — DROP tablas sin uso en código

```sql
-- ============================================================
-- FASE 0: Eliminar tablas sin referencias en el codebase
-- ============================================================

-- 0.1 actividades_duplicado (330 filas, 0 .from() en código, duplicado de activity)
DROP POLICY IF EXISTS "usuarios_pueden_leer" ON public.actividades_duplicado;
DROP TABLE IF EXISTS public.actividades_duplicado;

-- 0.2 usuarios_empresas (0 filas, 0 .from() en código, PK rota: solo empresa_id)
-- NOTA: is_admin_global_empresas() referencia esta tabla → actualizar la función PRIMERO
DROP POLICY IF EXISTS "admin " ON public.usuarios_empresas;
DROP TABLE IF EXISTS public.usuarios_empresas;

-- 0.3 naics_sectors / naics_subsectors (2 filas c/u, 0 .from(), jerarquía IRS ya cubre)
DROP TABLE IF EXISTS public.naics_subsectors;
DROP TABLE IF EXISTS public.naics_sectors;

-- 0.4 Eliminar índices duplicados
DROP INDEX IF EXISTS public.micro_servicios_id_micro_servicios_key;  -- duplica la PK
DROP INDEX IF EXISTS public.usuarios_user_id_key;                     -- duplica la PK

-- 0.5 Actualizar is_admin_global_empresas() para que no dependa de usuarios_empresas
--     (esta función se usa en policies de empresa, empresa_settings, formularios)
--     Opción A: reescribirla para usar user_roles con rol 'admin'
--     Opción B: dropearla y reemplazar con is_admin() en las policies afectadas
CREATE OR REPLACE FUNCTION public.is_admin_global_empresas()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT public.is_admin();
$$;
```

---

## Fase 1 — Tablas de bajo impacto (1–4 referencias en código)

### 1.1 `estados` → `us_state_filing_fees`

> **Motivo:** `states` ya existe (5.195 filas global). Esta tabla solo tiene fees/reglas de 51 estados USA.

```sql
-- Rename tabla
ALTER TABLE public.estados RENAME TO us_state_filing_fees;

-- Rename columnas
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "ListaDeEstados_Id" TO id;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "Estado" TO state_name;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "Fee" TO filing_fee;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "Varios" TO misc_notes;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "FrecuenciaDePago" TO payment_frequency;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "FechaLimite" TO due_date_rule;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN "Descripción" TO description;
ALTER TABLE public.us_state_filing_fees RENAME COLUMN abreviatura TO abbreviation;

-- Vista de compatibilidad
CREATE VIEW public.estados AS
SELECT
  id             AS "ListaDeEstados_Id",
  state_name     AS "Estado",
  filing_fee     AS "Fee",
  misc_notes     AS "Varios",
  payment_frequency AS "FrecuenciaDePago",
  due_date_rule  AS "FechaLimite",
  description    AS "Descripción",
  abbreviation   AS abreviatura
FROM public.us_state_filing_fees;

-- Recrear RLS (la policy era SELECT public true)
ALTER TABLE public.us_state_filing_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.us_state_filing_fees;
CREATE POLICY "public_read" ON public.us_state_filing_fees
  FOR SELECT TO public USING (true);
```

**Código a actualizar (4 archivos):**
- `src/domains/utils/generals/states.ts` — `.from('estados')`
- `src/modules/companies/stages/client-form/services/get-client-form-data.ts` — `.from('estados')`
- `src/modules/company-operations/stages/01-planning-meeting/PlanningMeetingOps.astro` — `.from('estados')`
- `workflow.planning_design_reports.state_id` → FK apunta a `estados.ListaDeEstados_Id` (ahora `us_state_filing_fees.id`)

**Mejora de tipo pendiente:** `filing_fee` debería ser `numeric(12,2)` en lugar de `float8`.

---

### 1.2 `empresa` → `legacy_companies`

> **Motivo:** `companies` ya existe como modelo nuevo. Esta tabla (3 filas) es legacy puro.

```sql
ALTER TABLE public.empresa RENAME TO legacy_companies;
ALTER TABLE public.legacy_companies RENAME COLUMN empresa_id TO id;
ALTER TABLE public.legacy_companies RENAME COLUMN nombre TO name;
ALTER TABLE public.legacy_companies RENAME COLUMN estado TO status;

CREATE VIEW public.empresa AS
SELECT id AS empresa_id, name AS nombre, created_at, slug, status AS estado
FROM public.legacy_companies;

-- Recrear policies
ALTER TABLE public.legacy_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actualizar" ON public.legacy_companies;
DROP POLICY IF EXISTS "admin" ON public.legacy_companies;
DROP POLICY IF EXISTS "empresa: admin can do all" ON public.legacy_companies;
DROP POLICY IF EXISTS "insertar" ON public.legacy_companies;
DROP POLICY IF EXISTS "lectura_general" ON public.legacy_companies;

CREATE POLICY "public_read" ON public.legacy_companies FOR SELECT TO public USING (true);
CREATE POLICY "admin_all" ON public.legacy_companies FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "authenticated_insert" ON public.legacy_companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.legacy_companies FOR UPDATE TO authenticated USING (true);
```

**Código a actualizar (2 archivos):**
- `src/domains/templates/transformers/incorporation-full/index.ts` — `.from('empresa')`
- `src/pages/api/companies/create.ts` — `.from('empresa_settings')` (tabla dependiente)

---

### 1.3 `empresa_settings` → `legacy_company_settings`

```sql
ALTER TABLE public.empresa_settings RENAME TO legacy_company_settings;
ALTER TABLE public.legacy_company_settings RENAME COLUMN empresa_id TO company_id;

-- FK apunta a empresa → legacy_companies (se actualiza automáticamente con el rename)

CREATE VIEW public.empresa_settings AS
SELECT company_id AS empresa_id, logo_url, theme, updated_at
FROM public.legacy_company_settings;

ALTER TABLE public.legacy_company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actualizar" ON public.legacy_company_settings;
DROP POLICY IF EXISTS "admin" ON public.legacy_company_settings;
DROP POLICY IF EXISTS "insertar_genral" ON public.legacy_company_settings;
DROP POLICY IF EXISTS "lectura" ON public.legacy_company_settings;

CREATE POLICY "public_read" ON public.legacy_company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.legacy_company_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "authenticated_insert" ON public.legacy_company_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.legacy_company_settings FOR UPDATE TO authenticated USING (true);
```

**Código a actualizar (1 archivo):**
- `src/pages/api/companies/create.ts` — `.from('empresa_settings')`

---

### 1.4 `managers_de_SCI` → `sci_managers`

```sql
ALTER TABLE public."managers_de_SCI" RENAME TO sci_managers;
ALTER TABLE public.sci_managers RENAME COLUMN nombre_completo TO full_name;

CREATE VIEW public."managers_de_SCI" AS
SELECT id, full_name AS nombre_completo, created_at, manager_sci_id
FROM public.sci_managers;

ALTER TABLE public.sci_managers ENABLE ROW LEVEL SECURITY;
-- Tenía RLS enabled pero SIN policies → agregar al menos lectura admin
CREATE POLICY "admin_all" ON public.sci_managers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

**Código a actualizar:** 0 archivos (solo referenciada por FK desde `empresas_incorporaciones`).

---

### 1.5 `managers_validados` → `validated_managers`

```sql
ALTER TABLE public.managers_validados RENAME TO validated_managers;

ALTER TABLE public.validated_managers RENAME COLUMN manager_id TO id;
ALTER TABLE public.validated_managers RENAME COLUMN empresa_incorporacion_id TO incorporation_case_id;
ALTER TABLE public.validated_managers RENAME COLUMN "Nombres_manager" TO full_name;
ALTER TABLE public.validated_managers RENAME COLUMN "Correo_electronico_manager" TO email;
ALTER TABLE public.validated_managers RENAME COLUMN "residente_fiscal_en_EE_UU_manager" TO is_us_tax_resident;
ALTER TABLE public.validated_managers RENAME COLUMN "Numero_de_ITIN_manager" TO itin;
ALTER TABLE public.validated_managers RENAME COLUMN numero_seguro_social TO ssn;
ALTER TABLE public.validated_managers RENAME COLUMN "Numero_de_pasaporte_manager" TO passport_number;
ALTER TABLE public.validated_managers RENAME COLUMN "Pais_de_nacionalidad_manager" TO nationality_country;
ALTER TABLE public.validated_managers RENAME COLUMN manager_misma_direccion_empresa TO same_address_as_company;
ALTER TABLE public.validated_managers RENAME COLUMN "Pais_de_nacionalidad_manager_2" TO nationality_country_2;
ALTER TABLE public.validated_managers RENAME COLUMN "Direccion_de_Manager" TO address;

CREATE VIEW public.managers_validados AS
SELECT
  id                       AS manager_id,
  incorporation_case_id    AS empresa_incorporacion_id,
  full_name                AS "Nombres_manager",
  email                    AS "Correo_electronico_manager",
  is_us_tax_resident       AS "residente_fiscal_en_EE_UU_manager",
  itin                     AS "Numero_de_ITIN_manager",
  ssn                      AS numero_seguro_social,
  passport_number          AS "Numero_de_pasaporte_manager",
  nationality_country      AS "Pais_de_nacionalidad_manager",
  same_address_as_company  AS manager_misma_direccion_empresa,
  nationality_country_2    AS "Pais_de_nacionalidad_manager_2",
  address                  AS "Direccion_de_Manager",
  created_at, updated_at
FROM public.validated_managers;

ALTER TABLE public.validated_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.validated_managers;
CREATE POLICY "admin_all" ON public.validated_managers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

**Código a actualizar (1 archivo):**
- `src/pages/api/incorporations/validate.ts` — `.from('managers_validados')`

---

### 1.6 `formularios` → `forms`

```sql
ALTER TABLE public.formularios RENAME TO forms;

ALTER TABLE public.forms RENAME COLUMN form_id TO id;
ALTER TABLE public.forms RENAME COLUMN titulo TO title;
ALTER TABLE public.forms RENAME COLUMN descripcion TO description;
ALTER TABLE public.forms RENAME COLUMN creado_por TO created_by;
ALTER TABLE public.forms RENAME COLUMN estado TO is_active;
ALTER TABLE public.forms RENAME COLUMN tema_json TO theme_json;
ALTER TABLE public.forms RENAME COLUMN empresa_id TO company_id;

CREATE VIEW public.formularios AS
SELECT
  id          AS form_id,
  slug, revision,
  title       AS titulo,
  description AS descripcion,
  schema_json,
  created_by  AS creado_por,
  created_at, updated_at,
  is_active   AS estado,
  theme_json  AS tema_json,
  company_id  AS empresa_id
FROM public.forms;

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.forms;
DROP POLICY IF EXISTS "insert_admin_empresas" ON public.forms;
DROP POLICY IF EXISTS "lectura_usuarios" ON public.forms;
DROP POLICY IF EXISTS "leer_admin_empresas" ON public.forms;
DROP POLICY IF EXISTS "update_admin_empresas" ON public.forms;

CREATE POLICY "admin_all" ON public.forms FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "authenticated_read" ON public.forms FOR SELECT TO authenticated USING (true);
```

**Código a actualizar:** 0 archivos directos (SurveyJS fue eliminado). La FK desde `submitted_forms.form_id` se auto-actualiza con el rename.

---

### 1.7 `servicio_extra` → `extra_services`

```sql
ALTER TABLE public.servicio_extra RENAME TO extra_services;

ALTER TABLE public.extra_services RENAME COLUMN servicio_ex_id TO service_id;
ALTER TABLE public.extra_services RENAME COLUMN nombre TO name;
ALTER TABLE public.extra_services RENAME COLUMN descripcion TO description;
ALTER TABLE public.extra_services RENAME COLUMN estado TO status;
ALTER TABLE public.extra_services RENAME COLUMN categoria TO category;
ALTER TABLE public.extra_services RENAME COLUMN link_imagen TO image_url;

CREATE VIEW public.servicio_extra AS
SELECT id, service_id AS servicio_ex_id, name AS nombre, link,
       description AS descripcion, status AS estado, created_at,
       category AS categoria, image_url AS link_imagen
FROM public.extra_services;

ALTER TABLE public.extra_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_users_can_read" ON public.extra_services;
CREATE POLICY "authenticated_read" ON public.extra_services FOR SELECT TO authenticated USING (true);
```

**Código a actualizar (1 archivo):**
- `src/domains/utils/generals/microservices.ts` — `.from('servicio_extra')`

---

## Fase 2 — Tablas de impacto medio (5–10 referencias)

### 2.1 `servicios` → `incorporation_services`

> **Motivo:** `services` ya existe (catálogo nuevo sin uso). Se usa `incorporation_services` para distinguir.

```sql
ALTER TABLE public.servicios RENAME TO incorporation_services;

ALTER TABLE public.incorporation_services RENAME COLUMN nombre TO name;
ALTER TABLE public.incorporation_services RENAME COLUMN precio TO price;
ALTER TABLE public.incorporation_services RENAME COLUMN categoria TO category;
ALTER TABLE public.incorporation_services RENAME COLUMN descripcion TO description;
ALTER TABLE public.incorporation_services RENAME COLUMN servicio_activo TO is_active;
ALTER TABLE public.incorporation_services RENAME COLUMN id_servicios TO service_uuid;
ALTER TABLE public.incorporation_services RENAME COLUMN etiqueta TO label;

CREATE VIEW public.servicios AS
SELECT id, name AS nombre, price AS precio, created_at,
       category AS categoria, description AS descripcion,
       is_active AS servicio_activo, service_uuid AS id_servicios,
       label AS etiqueta, odoo_default_code, odoo_product_template_id
FROM public.incorporation_services;

ALTER TABLE public.incorporation_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.incorporation_services;
DROP POLICY IF EXISTS "lectura_servicos" ON public.incorporation_services;
CREATE POLICY "admin_all" ON public.incorporation_services FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "public_read" ON public.incorporation_services FOR SELECT TO public USING (true);
```

**Mejora de tipo pendiente:** `price` debería ser `numeric(12,2)` en lugar de `float8`.

**Código a actualizar (7 archivos):**
- `src/domains/services/services.ts` — `.from('servicios')` ×3
- `src/pages/api/services/create.ts` — `.from('servicios')`
- `src/pages/api/services/update.ts` — `.from('servicios')`
- `src/pages/api/services/soft-delete.ts` — `.from('servicios')`
- `src/pages/api/services/restore.ts` — `.from('servicios')`
- `src/pages/api/payment/payment-intent.ts` — `.from('servicios')`
- `src/pages/api/payment/checkout-session.ts` — `.from('servicios')`
- `src/pages/api/payment/payment-intent-upgrade.ts` — `.from('servicios')`
- `src/pages/api/payment/checkout-session-upgrade.ts` — `.from('servicios')`

---

### 2.2 `micro_servicios` → `micro_services`

```sql
ALTER TABLE public.micro_servicios RENAME TO micro_services;

ALTER TABLE public.micro_services RENAME COLUMN nombre TO name;
ALTER TABLE public.micro_services RENAME COLUMN precio TO price;
ALTER TABLE public.micro_services RENAME COLUMN categoria TO category;
ALTER TABLE public.micro_services RENAME COLUMN descripcion TO description;
ALTER TABLE public.micro_services RENAME COLUMN estado TO is_active;
ALTER TABLE public.micro_services RENAME COLUMN icono TO icon;
ALTER TABLE public.micro_services RENAME COLUMN id_micro_servicios TO id;
ALTER TABLE public.micro_services RENAME COLUMN etiqueta TO label;

CREATE VIEW public.micro_servicios AS
SELECT name AS nombre, price AS precio, category AS categoria,
       description AS descripcion, is_active AS estado, created_at,
       icon AS icono, id AS id_micro_servicios, label AS etiqueta,
       odoo_default_code, odoo_product_template_id
FROM public.micro_services;

ALTER TABLE public.micro_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.micro_services;
DROP POLICY IF EXISTS "lectura_de_todos" ON public.micro_services;
CREATE POLICY "admin_all" ON public.micro_services FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "public_read" ON public.micro_services FOR SELECT TO public USING (true);
```

**Código a actualizar (3 archivos):**
- `src/domains/utils/generals/microservices.ts` — `.from('micro_servicios')`
- `src/pages/api/payment/payment-intent.ts` — `.from('micro_servicios')`
- `src/pages/api/payment/checkout-session.ts` — `.from('micro_servicios')`

---

### 2.3 `datos_facturacion` → `billing_info`

```sql
ALTER TABLE public.datos_facturacion RENAME TO billing_info;

ALTER TABLE public.billing_info RENAME COLUMN "personería" TO person_type;
ALTER TABLE public.billing_info RENAME COLUMN nombre_o_razon_social TO legal_name;
ALTER TABLE public.billing_info RENAME COLUMN correo TO email;
ALTER TABLE public.billing_info RENAME COLUMN telefono TO phone;
ALTER TABLE public.billing_info RENAME COLUMN documento_de_identidad TO identification_number;
ALTER TABLE public.billing_info RENAME COLUMN direccion_linea_1 TO address_line_1;
ALTER TABLE public.billing_info RENAME COLUMN ciudad TO city;
ALTER TABLE public.billing_info RENAME COLUMN pais TO country;
ALTER TABLE public.billing_info RENAME COLUMN tipo_de_documento TO identification_type;

CREATE VIEW public.datos_facturacion AS
SELECT id, person_type AS "personería", legal_name AS nombre_o_razon_social,
       email AS correo, phone AS telefono, identification_number AS documento_de_identidad,
       address_line_1 AS direccion_linea_1, city AS ciudad, country AS pais,
       created_at, user_id, identification_type AS tipo_de_documento
FROM public.billing_info;

ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.billing_info;
DROP POLICY IF EXISTS "actualizar_usuarios" ON public.billing_info;
DROP POLICY IF EXISTS "insertar datos de facturacion" ON public.billing_info;

CREATE POLICY "owner_read" ON public.billing_info FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_insert" ON public.billing_info FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_update" ON public.billing_info FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
```

**Código a actualizar (2 archivos):**
- `src/domains/users/billing.ts` — `.from('datos_facturacion')` ×2
- `src/pages/api/billing/update-invoice.ts` — `.from('datos_facturacion')`
- `src/pages/api/billing/upsert-invoice.ts` — BUG: usa `facturacion` (no existe), corregir a `billing_info`

---

### 2.4 `documentos_por_firmar` → `pending_signatures`

```sql
ALTER TABLE public.documentos_por_firmar RENAME TO pending_signatures;

ALTER TABLE public.pending_signatures RENAME COLUMN empresa_incorporacion_id TO incorporation_case_id;
ALTER TABLE public.pending_signatures RENAME COLUMN nombre TO name;
ALTER TABLE public.pending_signatures RENAME COLUMN categoria TO category;

CREATE VIEW public.documentos_por_firmar AS
SELECT id, user_id, incorporation_case_id AS empresa_incorporacion_id,
       storage_path, name AS nombre, category AS categoria,
       status, created_at, updated_at
FROM public.pending_signatures;

ALTER TABLE public.pending_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.pending_signatures;
DROP POLICY IF EXISTS "all_users_can_read" ON public.pending_signatures;
DROP POLICY IF EXISTS "users_can_insert" ON public.pending_signatures;
DROP POLICY IF EXISTS "users_can_update" ON public.pending_signatures;

CREATE POLICY "admin_all" ON public.pending_signatures FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owner_read" ON public.pending_signatures FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "owner_insert" ON public.pending_signatures FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "owner_update" ON public.pending_signatures FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
```

**Código a actualizar (3 archivos):**
- `src/domains/documents/pending-signature.ts` — `.from('documentos_por_firmar')`
- `src/pages/api/documents/upload-signed.ts` — `.from('documentos_por_firmar')`
- `src/domains/admin/incorporations.ts` — `.from('documentos_por_firmar')` ×2

---

### 2.5 `documentos_usuarios` → `user_documents`

```sql
ALTER TABLE public.documentos_usuarios RENAME TO user_documents;

ALTER TABLE public.user_documents RENAME COLUMN tipo_documento TO document_type;
ALTER TABLE public.user_documents RENAME COLUMN nombre_archivo TO file_name;
ALTER TABLE public.user_documents RENAME COLUMN url_archivo TO file_url;
ALTER TABLE public.user_documents RENAME COLUMN estado TO status;

CREATE VIEW public.documentos_usuarios AS
SELECT id, user_id, created_at, document_type AS tipo_documento,
       file_name AS nombre_archivo, file_url AS url_archivo, status AS estado
FROM public.user_documents;

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.user_documents;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.user_documents;
DROP POLICY IF EXISTS "admin" ON public.user_documents;

CREATE POLICY "admin_all" ON public.user_documents FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owner_read" ON public.user_documents FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "owner_insert" ON public.user_documents FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

**Código a actualizar (3 archivos):**
- `src/domains/documents/user-documents.ts` — `.from('documentos_usuarios')`
- `src/domains/documents/documents.ts` — `.from('documentos_usuarios')`
- `src/pages/api/partners/upload-contract.ts` — `.from('documentos_usuarios')`
- `src/pages/api/partners/contract.ts` — `.from('documentos_usuarios')`

---

### 2.6 `socios_validados` → `validated_partners`

```sql
ALTER TABLE public.socios_validados RENAME TO validated_partners;

ALTER TABLE public.validated_partners RENAME COLUMN socio_id TO id;
ALTER TABLE public.validated_partners RENAME COLUMN id_empresa TO incorporation_case_id;
ALTER TABLE public.validated_partners RENAME COLUMN tipo_de_socio TO partner_type;
ALTER TABLE public.validated_partners RENAME COLUMN nombre_de_socio TO partner_name;
ALTER TABLE public.validated_partners RENAME COLUMN correo TO email;
ALTER TABLE public.validated_partners RENAME COLUMN porcentaje TO percentage;
ALTER TABLE public.validated_partners RENAME COLUMN estado_civil TO marital_status;
ALTER TABLE public.validated_partners RENAME COLUMN residente_fiscal TO is_tax_resident;
ALTER TABLE public.validated_partners RENAME COLUMN numero_de_pasaporte TO passport_number;
ALTER TABLE public.validated_partners RENAME COLUMN pais_de_nacionalidad TO nationality_country;
ALTER TABLE public.validated_partners RENAME COLUMN numero_de_seguro_social TO ssn;
ALTER TABLE public.validated_partners RENAME COLUMN numero_itin TO itin;
ALTER TABLE public.validated_partners RENAME COLUMN pais_planilla TO payroll_country;
ALTER TABLE public.validated_partners RENAME COLUMN direccion_planilla TO payroll_address;

CREATE VIEW public.socios_validados AS
SELECT
  id                    AS socio_id,
  incorporation_case_id AS id_empresa,
  partner_type          AS tipo_de_socio,
  partner_name          AS nombre_de_socio,
  email                 AS correo,
  percentage            AS porcentaje,
  marital_status        AS estado_civil,
  is_tax_resident       AS residente_fiscal,
  passport_number       AS numero_de_pasaporte,
  nationality_country   AS pais_de_nacionalidad,
  ssn                   AS numero_de_seguro_social,
  itin                  AS numero_itin,
  payroll_country       AS pais_planilla,
  payroll_address       AS direccion_planilla,
  created_at, updated_at, roles
FROM public.validated_partners;

ALTER TABLE public.validated_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.validated_partners;
CREATE POLICY "admin_all" ON public.validated_partners FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
```

**Código a actualizar (2 archivos):**
- `src/domains/companies/validated-partners.ts` — `.from('socios_validados')` ×3
- `src/pages/api/incorporations/validate.ts` — `.from('socios_validados')`

---

### 2.7 `referidos` → `referrals`

```sql
ALTER TABLE public.referidos RENAME TO referrals;

ALTER TABLE public.referrals RENAME COLUMN referido_id TO referred_user_id;

CREATE VIEW public.referidos AS
SELECT id, partner_id, referred_user_id AS referido_id, code, source, created_at
FROM public.referrals;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura_solo_referidos" ON public.referrals;
CREATE POLICY "partner_read_own" ON public.referrals FOR SELECT TO authenticated
  USING (partner_id = (SELECT auth.uid()));
```

**Código a actualizar (2 archivos):**
- `src/domains/partners/referrals.ts` — `.from('referidos')`
- `src/modules/dashboard/dashboard-partners.client.ts` — `.from('referidos')`

**Dependencia:** La policy `partner_puede_ver_referidos` en `usuarios` hace `SELECT referidos.referido_id FROM referidos`. La vista de compatibilidad cubre esto; al retirar la vista, actualizar esa policy para usar `referrals.referred_user_id`.

---

## Fase 3 — Tablas de alto impacto (10+ referencias)

### 3.1 `pagos` → `payments`

```sql
ALTER TABLE public.pagos RENAME TO payments;

ALTER TABLE public.payments RENAME COLUMN id_pagos TO id;
ALTER TABLE public.payments RENAME COLUMN servicio_id TO service_id;
ALTER TABLE public.payments RENAME COLUMN empresa_incorporacion_id TO incorporation_case_id;
ALTER TABLE public.payments RENAME COLUMN visto_por_operaciones TO seen_by_operations;

CREATE VIEW public.pagos AS
SELECT
  user_id,
  service_id           AS servicio_id,
  amount, status, created_at, stripe_payment_intent_id,
  incorporation_case_id AS empresa_incorporacion_id,
  seen_by_operations   AS visto_por_operaciones,
  id                   AS id_pagos,
  odoo_invoice_id, odoo_sale_order_id, source
FROM public.payments;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.payments;
DROP POLICY IF EXISTS "users_can_read" ON public.payments;
CREATE POLICY "admin_all" ON public.payments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owner_read" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

**Código a actualizar (7 archivos):**
- `src/domains/payments/payments.ts` — `.from('pagos')` ×2
- `src/domains/payments/unread.ts` — `.from('pagos')` ×5
- `src/domains/admin/incorporations.ts` — `.from('pagos')` ×2

---

### 3.2 `usuarios` → `user_profiles`

> **Motivo:** `users` colisiona con `auth.users`. Se usa `user_profiles`.

```sql
ALTER TABLE public.usuarios RENAME TO user_profiles;

ALTER TABLE public.user_profiles RENAME COLUMN nombre TO first_name;
ALTER TABLE public.user_profiles RENAME COLUMN apellido TO last_name;
ALTER TABLE public.user_profiles RENAME COLUMN correo TO email;
ALTER TABLE public.user_profiles RENAME COLUMN pais_id TO country_id;
ALTER TABLE public.user_profiles RENAME COLUMN ciudad TO city;
ALTER TABLE public.user_profiles RENAME COLUMN direccion_linea1 TO address_line_1;
ALTER TABLE public.user_profiles RENAME COLUMN direccion_linea2 TO address_line_2;
ALTER TABLE public.user_profiles RENAME COLUMN codigo_postal TO zip_code;
ALTER TABLE public.user_profiles RENAME COLUMN codigo_de_partner TO partner_code;
ALTER TABLE public.user_profiles RENAME COLUMN telf TO phone;
ALTER TABLE public.user_profiles RENAME COLUMN fecha_nacimiento TO birth_date;
ALTER TABLE public.user_profiles RENAME COLUMN organizacion TO organization;
ALTER TABLE public.user_profiles RENAME COLUMN cargo TO job_title;
ALTER TABLE public.user_profiles RENAME COLUMN departamento TO department;
ALTER TABLE public.user_profiles RENAME COLUMN estado TO status;
ALTER TABLE public.user_profiles RENAME COLUMN referido_por TO referred_by;
ALTER TABLE public.user_profiles RENAME COLUMN tipo_identificacion TO identification_type;
ALTER TABLE public.user_profiles RENAME COLUMN numero_de_identificacion TO identification_number;
ALTER TABLE public.user_profiles RENAME COLUMN tipo_persona TO person_type;
ALTER TABLE public.user_profiles RENAME COLUMN empresa_id TO legacy_company_ids;

CREATE VIEW public.usuarios AS
SELECT
  user_id, created_at,
  first_name        AS nombre,
  last_name         AS apellido,
  email             AS correo,
  country_id        AS pais_id,
  city              AS ciudad,
  address_line_1    AS direccion_linea1,
  address_line_2    AS direccion_linea2,
  zip_code          AS codigo_postal,
  partner_code      AS codigo_de_partner,
  avatar_url,
  phone             AS telf,
  birth_date        AS fecha_nacimiento,
  organization      AS organizacion,
  job_title         AS cargo,
  department        AS departamento,
  status            AS estado,
  referred_by       AS referido_por,
  identification_type    AS tipo_identificacion,
  identification_number  AS numero_de_identificacion,
  person_type       AS tipo_persona,
  odoo_partner_id,
  legacy_company_ids AS empresa_id
FROM public.user_profiles;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin" ON public.user_profiles;
DROP POLICY IF EXISTS "insertar" ON public.user_profiles;
DROP POLICY IF EXISTS "lectura" ON public.user_profiles;
DROP POLICY IF EXISTS "partner_puede_ver_referidos" ON public.user_profiles;
DROP POLICY IF EXISTS "update_user" ON public.user_profiles;

CREATE POLICY "admin_all" ON public.user_profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owner_insert" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "owner_read" ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "partner_read_referrals" ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IN (SELECT referred_user_id FROM public.referrals WHERE partner_id = auth.uid()));
CREATE POLICY "owner_update" ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
```

**Funciones a actualizar:** `is_admin()` referencia `user_roles` (sin cambio) pero la policy `partner_puede_ver_referidos` referencia `referidos` (cubierta por vista hasta fase final).

**Código a actualizar (15+ archivos):**
- `src/domains/users/users.ts` ×4
- `src/domains/admin/users.ts` ×3
- `src/domains/partners/referrals.ts` ×1
- `src/domains/templates/transformers/incorporation-full/index.ts` ×1
- `src/modules/dashboard/Dashboard.astro` ×1
- `src/modules/company-operations/services/get-operations-panel-data.ts` ×1
- `src/modules/admin/CrudMailing.astro` ×1
- `src/pages/api/users/update.ts` ×1
- `src/pages/api/users/update-profile.ts` ×1
- `src/pages/api/users/update-avatar.ts` ×1
- `src/pages/api/users/create-admin.ts` ×1
- `src/pages/api/admin/users/[id]/index.ts` ×1
- `src/pages/api/admin/users/[id]/archive.ts` ×1
- `src/pages/api/partners/redeem-code.ts` ×1
- `src/pages/api/companies/update-profile.ts` ×1
- `src/pages/api/companies/update-avatar.ts` ×1
- `src/lib/infrastructure/notifications/channels/email.ts` ×1

---

### 3.3 `empresas_incorporaciones` → `incorporation_cases`

> **La tabla más crítica: ~30 call sites + FKs desde documents.*, workflow.*, pagos, etc.**

```sql
ALTER TABLE public.empresas_incorporaciones RENAME TO incorporation_cases;

ALTER TABLE public.incorporation_cases RENAME COLUMN empresa_incorporacion_id TO id;
ALTER TABLE public.incorporation_cases RENAME COLUMN tipo_de_negocio TO business_type;
ALTER TABLE public.incorporation_cases RENAME COLUMN estado_de_incorporacion TO incorporation_status;
ALTER TABLE public.incorporation_cases RENAME COLUMN nombre_1 TO name_option_1;
ALTER TABLE public.incorporation_cases RENAME COLUMN nombre_2 TO name_option_2;
ALTER TABLE public.incorporation_cases RENAME COLUMN nombre_3 TO name_option_3;
ALTER TABLE public.incorporation_cases RENAME COLUMN estado TO legacy_state_name;
ALTER TABLE public.incorporation_cases RENAME COLUMN porcentaje_de_incorporacion TO incorporation_progress;
ALTER TABLE public.incorporation_cases RENAME COLUMN "Obtendra_ingresos_desde_eeuu" TO has_us_source_income;
ALTER TABLE public.incorporation_cases RENAME COLUMN actividad TO activity_name_legacy;
ALTER TABLE public.incorporation_cases RENAME COLUMN actividad_no_listada TO unlisted_activity;
ALTER TABLE public.incorporation_cases RENAME COLUMN forma_administracion TO management_type;
ALTER TABLE public.incorporation_cases RENAME COLUMN forma_tributacion TO tax_classification;
ALTER TABLE public.incorporation_cases RENAME COLUMN direccion_operativa_eeuu TO us_operating_address;
ALTER TABLE public.incorporation_cases RENAME COLUMN direccion_eeuu TO us_address;
ALTER TABLE public.incorporation_cases RENAME COLUMN condado_eeuu TO us_county;
ALTER TABLE public.incorporation_cases RENAME COLUMN ciudad_eeuu TO us_city;
ALTER TABLE public.incorporation_cases RENAME COLUMN estado_eeuu TO us_state_name;
ALTER TABLE public.incorporation_cases RENAME COLUMN codigo_postal_eeuu TO us_zip_code;
ALTER TABLE public.incorporation_cases RENAME COLUMN "Pais_operativo" TO operating_country;
ALTER TABLE public.incorporation_cases RENAME COLUMN direccion_empresa TO company_address;
ALTER TABLE public.incorporation_cases RENAME COLUMN fecha_de_validacion TO validated_at;
ALTER TABLE public.incorporation_cases RENAME COLUMN responsable_irs TO irs_responsible;
ALTER TABLE public.incorporation_cases RENAME COLUMN manager_sci TO is_sci_manager;
ALTER TABLE public.incorporation_cases RENAME COLUMN manager_es_miembro TO manager_is_member;
ALTER TABLE public.incorporation_cases RENAME COLUMN manager_fuera_de_la_lista TO manager_unlisted;
ALTER TABLE public.incorporation_cases RENAME COLUMN informacion_miembros TO members_info_legacy;
ALTER TABLE public.incorporation_cases RENAME COLUMN "manager_designado_por_SCI" TO sci_manager_id;

-- Vista de compatibilidad completa
CREATE VIEW public.empresas_incorporaciones AS
SELECT
  user_id,
  business_type         AS tipo_de_negocio,
  incorporation_status  AS estado_de_incorporacion,
  name_option_1         AS nombre_1,
  legacy_state_name     AS estado,
  updated_at,
  id                    AS empresa_incorporacion_id,
  name_option_2         AS nombre_2,
  name_option_3         AS nombre_3,
  incorporation_progress AS porcentaje_de_incorporacion,
  has_us_source_income  AS "Obtendra_ingresos_desde_eeuu",
  activity_name_legacy  AS actividad,
  unlisted_activity     AS actividad_no_listada,
  management_type       AS forma_administracion,
  tax_classification    AS forma_tributacion,
  us_operating_address  AS direccion_operativa_eeuu,
  us_address            AS direccion_eeuu,
  us_county             AS condado_eeuu,
  us_city               AS ciudad_eeuu,
  us_state_name         AS estado_eeuu,
  us_zip_code           AS codigo_postal_eeuu,
  operating_country     AS "Pais_operativo",
  company_address       AS direccion_empresa,
  validated_at          AS fecha_de_validacion,
  irs_responsible       AS responsable_irs,
  is_sci_manager        AS manager_sci,
  manager_is_member     AS manager_es_miembro,
  manager_unlisted      AS manager_fuera_de_la_lista,
  members_info_legacy   AS informacion_miembros,
  sci_manager_id        AS "manager_designado_por_SCI",
  odoo_sale_order_id, source, activity_id, state_id,
  activity_description, company_id
FROM public.incorporation_cases;

-- RLS
ALTER TABLE public.incorporation_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.incorporation_cases;
DROP POLICY IF EXISTS "admin" ON public.incorporation_cases;
DROP POLICY IF EXISTS "empresas_incorporaciones_insert_owner_or_staff" ON public.incorporation_cases;
DROP POLICY IF EXISTS "empresas_incorporaciones_select_accessible" ON public.incorporation_cases;
DROP POLICY IF EXISTS "empresas_incorporaciones_update_owner_or_staff" ON public.incorporation_cases;
DROP POLICY IF EXISTS "insertar" ON public.incorporation_cases;
DROP POLICY IF EXISTS "update" ON public.incorporation_cases;
DROP POLICY IF EXISTS "updete" ON public.incorporation_cases;

CREATE POLICY "admin_all" ON public.incorporation_cases FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "staff_select" ON public.incorporation_cases FOR SELECT TO authenticated
  USING (is_company_staff() OR user_id = (SELECT auth.uid()));
CREATE POLICY "staff_or_owner_insert" ON public.incorporation_cases FOR INSERT TO authenticated
  WITH CHECK (is_company_staff() OR user_id = auth.uid());
CREATE POLICY "staff_or_owner_update" ON public.incorporation_cases FOR UPDATE TO authenticated
  USING (is_company_staff() OR user_id = auth.uid())
  WITH CHECK (is_company_staff() OR user_id = auth.uid());
```

**Funcion a actualizar:**
```sql
CREATE OR REPLACE FUNCTION public.user_can_access_incorporation(p_incorporation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_company_staff()
    OR EXISTS (
      SELECT 1 FROM public.incorporation_cases ic
      WHERE ic.id = p_incorporation_id
        AND ic.user_id = auth.uid()
    );
$$;
```

**Código a actualizar (~30 archivos):**
- `src/domains/companies/incorporations.ts` ×7
- `src/domains/companies/companies.ts` ×3
- `src/domains/companies/incorporation-details.ts` ×2
- `src/domains/companies/company-records.ts` ×3
- `src/domains/documents/service.ts` ×2
- `src/domains/admin/users.ts` ×2
- `src/domains/admin/incorporations.ts` ×3
- `src/domains/admin/empresas.ts` ×1
- `src/domains/workflow/stages/planning-meeting-recipients.ts` ×1
- `src/domains/workflow/stages/planning-design-report.ts` ×1
- `src/modules/companies/services/get-company-page-data.ts` ×1
- `src/modules/companies/services/get-client-workflow-progress.ts` ×1
- `src/modules/companies/stages/client-form/services/get-client-form-data.ts` ×1
- `src/modules/company-operations/services/get-operations-panel-data.ts` ×1
- `src/modules/company-operations/stages/01-planning-meeting/PlanningMeetingOps.astro` ×1
- `src/modules/billing/AnnualMaintenance.astro` ×1
- `src/pages/onboarding.astro` ×2
- `src/pages/api/onboarding/complete.ts` ×1
- `src/pages/api/incorporations/save.ts` ×1
- `src/pages/api/incorporations/validate.ts` ×1
- `src/pages/api/incorporations/get-status.ts` ×2
- `src/pages/api/incorporations/update-identity.ts` ×1
- `src/pages/api/companies/set-active.ts` ×1
- `src/pages/api/auth/reset-password.ts` ×1
- `src/pages/api/meetings/create-booking-intent.ts` ×1
- `src/pages/api/workflow/planning/decision.ts` ×1
- Cross-schema FKs (auto-updated by rename): `documents.documents.case_id`, `documents.document_events.case_id`, `documents.document_requests.case_id`, `documents.document_shares.case_id`, `workflow.incorporation_workflows.incorporation_id`, `workflow.incorporation_tasks.incorporation_id`, `workflow.approval_records.incorporation_id`, `workflow.planning_design_reports.incorporation_id`, `public.payments.incorporation_case_id`, `public.pending_signatures.incorporation_case_id`, `public.validated_partners.incorporation_case_id`, `public.validated_managers.incorporation_case_id`, `public.submitted_forms.empresa_incorporacion_id`

---

## Fase 4 — Limpieza final (retirar vistas de compatibilidad)

Ejecutar cuando el grep del codebase no devuelva el nombre viejo:

```sql
-- Para cada tabla migrada, verificar con:
-- grep -rn "from('nombre_viejo')" src/

DROP VIEW IF EXISTS public.estados;
DROP VIEW IF EXISTS public.empresa;
DROP VIEW IF EXISTS public.empresa_settings;
DROP VIEW IF EXISTS public."managers_de_SCI";
DROP VIEW IF EXISTS public.managers_validados;
DROP VIEW IF EXISTS public.formularios;
DROP VIEW IF EXISTS public.servicio_extra;
DROP VIEW IF EXISTS public.servicios;
DROP VIEW IF EXISTS public.micro_servicios;
DROP VIEW IF EXISTS public.datos_facturacion;
DROP VIEW IF EXISTS public.documentos_por_firmar;
DROP VIEW IF EXISTS public.documentos_usuarios;
DROP VIEW IF EXISTS public.socios_validados;
DROP VIEW IF EXISTS public.referidos;
DROP VIEW IF EXISTS public.pagos;
DROP VIEW IF EXISTS public.usuarios;
DROP VIEW IF EXISTS public.empresas_incorporaciones;
```

---

## Resumen: Mapeo completo de tablas

| # | Tabla actual (español) | Tabla nueva (inglés) | Filas | Call sites | Fase |
|---|---|---|---|---|---|
| - | `actividades_duplicado` | **DROP** | 330 | 0 | 0 |
| - | `usuarios_empresas` | **DROP** | 0 | 0 | 0 |
| - | `naics_sectors` | **DROP** | 2 | 0 | 0 |
| - | `naics_subsectors` | **DROP** | 2 | 0 | 0 |
| 1 | `estados` | `us_state_filing_fees` | 51 | 4 | 1 |
| 2 | `empresa` | `legacy_companies` | 3 | 2 | 1 |
| 3 | `empresa_settings` | `legacy_company_settings` | 3 | 1 | 1 |
| 4 | `managers_de_SCI` | `sci_managers` | 3 | 0 | 1 |
| 5 | `managers_validados` | `validated_managers` | 2 | 1 | 1 |
| 6 | `formularios` | `forms` | 4 | 0 | 1 |
| 7 | `servicio_extra` | `extra_services` | 5 | 1 | 1 |
| 8 | `servicios` | `incorporation_services` | 5 | 9 | 2 |
| 9 | `micro_servicios` | `micro_services` | 10 | 3 | 2 |
| 10 | `datos_facturacion` | `billing_info` | 2 | 3 | 2 |
| 11 | `documentos_por_firmar` | `pending_signatures` | 15 | 3 | 2 |
| 12 | `documentos_usuarios` | `user_documents` | 0 | 4 | 2 |
| 13 | `socios_validados` | `validated_partners` | 11 | 4 | 2 |
| 14 | `referidos` | `referrals` | 0 | 2 | 2 |
| 15 | `pagos` | `payments` | 29 | 9 | 3 |
| 16 | `usuarios` | `user_profiles` | 31 | 17+ | 3 |
| 17 | `empresas_incorporaciones` | `incorporation_cases` | 43 | 30+ | 3 |

## Resumen: Columnas renombradas por tabla

**Total: ~100 columnas renombradas** distribuidas según la tabla anterior. Cada rename de columna queda documentado en su sección de fase correspondiente con el SQL exacto de `ALTER TABLE RENAME COLUMN`.

## Funciones que referencian nombres legacy

| Función | Referencia | Acción |
|---|---|---|
| `is_admin_global_empresas()` | `usuarios_empresas` | Reescribir como alias de `is_admin()` (Fase 0) |
| `user_can_access_incorporation()` | `empresas_incorporaciones` | Reescribir con `incorporation_cases` (Fase 3) |
| Policy `partner_puede_ver_referidos` en `usuarios` | `referidos.referido_id` | Reescribir con `referrals.referred_user_id` (Fase 4) |

## Notas de ejecución

1. **Orden estricto:** Fase 0 → 1 → 2 → 3 → 4. No saltar.
2. **Backup antes de cada fase:** `pg_dump` del schema antes de ejecutar.
3. **Transaccionalidad:** cada fase puede ir en un solo `BEGIN...COMMIT`.
4. **FKs cross-schema:** Postgres propaga `ALTER TABLE RENAME` automáticamente a las FK constraints; las columnas de las tablas hijas no cambian de nombre pero la referencia interna se actualiza.
5. **Vistas y supabase-js:** `supabase.from('vista')` funciona igual que `supabase.from('tabla')` — PostgREST expone ambos. Las vistas heredan las policies de las tablas subyacentes a través de `SECURITY INVOKER` (default en Postgres 17).
6. **Tiempos de lock:** `ALTER TABLE RENAME` toma `AccessExclusiveLock` pero es instantáneo (solo actualiza catálogos). Safe para producción en horario de bajo tráfico.
