# Plan de Migración de Datos → Dashboard (consolidación única)

**Proyecto:** DASHBOARD-TEST (`ceuofnjslxjoqtqxbfqt`) · Postgres 17.4
**Fecha:** 2026-06-19
**Estado:** PLAN — revisar antes de ejecutar

---

## 0. Decisiones tomadas (alcance)

| Decisión | Elección | Implicación |
|---|---|---|
| **Esquema destino** | Nuevo esquema normalizado (`companies`, `members`, `company_members`, `workflow.*`, …) | La data migrada **no se verá en la app** hasta repuntar los `.from()` (cutover de código). |
| **Tipo de migración** | **Carga única (consolidación)** | El dashboard pasa a ser el **sistema de registro**. Las fuentes se congelan/archivan al terminar. |
| **Tooling** | **n8n** estructura los datos + **CSV** como respaldo/staging (**sin schema nuevo en la DB**) | n8n transforma cada registro a un **contrato JSON** (`migrations/*.json`) y lo carga a las tablas destino. |
| **Fuentes** | Cognito Forms · Google Sheets / Excel · Odoo | Ver §2 para qué entidad aporta cada una. |

> **Aclaración clave sobre "esquema normalizado":** no todas las entidades tienen aún una tabla nueva en inglés. Las que **sí existen** son `companies`, `members`, `company_members`, `company_addresses`, `member_addresses`, `services`, `service_plans`, `service_plan_lines`, `orders`, `order_lines`, `referidos` (columnas ya normalizadas), y los schemas `workflow.*` / `documents.*` / `meetings.*`. Para **clientes**, **pagos** y **facturación** la tabla de facto sigue siendo `usuarios`, `pagos`, `datos_facturacion` (el [standardization-plan](standardization-plan.md) las renombrará a `user_profiles`/`payments`/`billing_info` después; la **data cargada no se ve afectada por ese rename**). Por eso esta migración carga a esas tablas tal cual existen hoy y queda compatible con la estandarización futura.

---

## 1. Principio rector: la identidad (`auth.users`) es el ancla

Todo el modelo cuelga de un **UUID de usuario**:
`companies.user_id` / `companies.created_by`, `members.user_id`, `orders.client_id`, `pagos.user_id`, `referidos.partner_id` / `referido_id`, `user_roles.user_id` → todos referencian `auth.users(id)` (espejado en `usuarios.user_id`).

**Consecuencia operativa:** no se puede cargar ninguna empresa, persona, orden ni pago sin haber **resuelto/creado primero el usuario** y su mapeo `email → uuid`. La fase de **identidad y deduplicación** es el cuello de botella y debe completarse y validarse antes que el resto.

---

## 2. Matriz fuente → entidad → destino

| Entidad | Cognito Forms | Google Sheets / Excel | Odoo | Tabla(s) destino | Fuente de verdad sugerida |
|---|---|---|---|---|---|
| **Cliente / contacto** | Intake (nombre, email, tel, país, ID) | Maestro de clientes | `res.partner` | `auth.users` + `usuarios` (+ `user_roles`=`cliente`) | Sheets (operativa) enriquecida con Odoo email/tel |
| **Empresa / LLC** | Datos de incorporación (nombres, tipo, estado, actividad, dirección) | Tracking de LLCs | — | `companies` + `company_addresses` | Sheets + Cognito |
| **Socios / managers** | Sección de miembros del form | Hoja de socios | — | `members` + `company_members` (+ `member_addresses`) | Cognito (detalle) + Sheets |
| **Proceso de incorporación / estado** | — | Estado del caso (columna "status") | — | `workflow.incorporation_workflows` (+ `incorporation_forms`) | Sheets |
| **Catálogo de servicios / planes** | — | Lista de precios | `product.template` | `services` + `service_plans` + `service_plan_lines` | Odoo |
| **Órdenes / pagos / facturas** | — | Tracking de cobros | `sale.order`, `account.move` | `orders` + `order_lines` + `pagos` | Odoo (facturación) + Stripe (`pagos.stripe_*`) |
| **Referidos / partners** | — | Hoja de referidos | `res.partner.x_referido_id` | `referidos` | Odoo |
| **Documentos** (opcional, fuera del MVP) | Adjuntos | Links Drive | — | `documents.*` | — |

> Donde una entidad aparece en varias fuentes, la **fuente de verdad** define qué valor gana en caso de conflicto; las demás solo **enriquecen** campos faltantes.

---

## 3. Arquitectura: CSV + n8n → contrato JSON → Supabase

**Sin schema nuevo en la base de datos.** El staging vive en archivos CSV y la transformación en n8n:

```
[Cognito / Sheets / Odoo] ─► export ─► CSV (respaldo, fuente congelada con fecha de corte)
                                          │
                                          ▼
                                    n8n (estructura + limpia + mapea enums/FK)
                                          │
                                          ▼
                             contrato JSON por caso  (migrations/*.json)
                                          │
                                          ▼
                             n8n carga ordenada a las tablas destino (service role)
```

- **CSV = respaldo y staging.** Cada export queda como archivo congelado con fecha de corte; es la evidencia para reconciliar y re-correr.
- **n8n hace la transformación** (no SQL en la DB): toma el CSV crudo y produce **un objeto JSON autocontenido por caso de incorporación**, conforme al contrato `migrations/cognito-forms-company.json`.
- **El JSON es autocontenido** (`user` + `company` + `addresses` + `members[]` + `company_member` juntos), lo que **elimina la necesidad de tablas `id_map`**: n8n inserta en orden dentro del mismo registro y **encadena los UUID devueltos** (user → su uuid → `company.user_id`; company → su uuid → `company_member.company_id` y `company_addresses.company_id`; member → su uuid → `company_member.member_id`). Todo en memoria, por registro.
- **Idempotencia** por **upsert sobre clave natural** (email del cliente, `identification_number` del miembro, `stripe_payment_intent_id`/`odoo_invoice_id` del pago). Re-importar el CSV no duplica.
- **Carga con service role** (bypassa RLS); credencial en n8n, nunca en el JSON.
- Para crear usuarios: **Supabase Auth Admin API** (`POST /auth/v1/admin/users`, `email_confirm: true`, sin password → invitación/magic-link posterior) vía nodo HTTP de n8n.

### 3.1 Correcciones obligatorias al contrato `migrations/cognito-forms-company.json`

El contrato actual tiene desajustes contra el esquema real que **harían fallar los inserts**:

| Problema | En el contrato | Correcto en la DB |
|---|---|---|
| Typo | `company.magement_type` | `management_type` |
| Nombre col. | `*_addresses.address_line_1/2` | `line1` / `line2` |
| Nombre col. | `company_member.date_start/date_end` | `start_date` / `end_date` |
| Falta `NOT NULL` | `company_addresses.city`, `country_id` | obligatorios |
| Falta `NOT NULL` | `member_addresses.city`, `is_primary` | obligatorios |
| Enum vacío `""` | `entity_type`, `management_type`, `legal_status`, `person_type`, `identification_type`, `marital_status` | valor válido o `null` (los `NOT NULL` exigen valor) |
| Sin columna | `member.email`, `member.us_resident` | mover a bloque `_meta` (matching / helper) |
| Sin columna | `company_member.is_irs_responsible` | transitorio → setear `companies.irs_email` con el email del miembro responsable |
| Estructura | `member` / `company_member` como objeto único | **array `members[]`** con `company_member` anidado por miembro |
| Identidad | sin `user_id` / `created_by` ni FKs | resolver en runtime (encadenar UUID); usar `null`, no `""` |

`tax_clasification` se deja igual: la columna en la DB está realmente escrita así.

---

## 4. Orden de carga (estricto, por dependencias)

| # | Bloque | Depende de | Notas |
|---|---|---|---|
| 1 | **Catálogos base** (`countries` 240, `states` 5195, `activity/category/sector`) | — | Ya poblados. Solo **verificar** y construir `dict_country`/`dict_state`. |
| 2 | **Servicios / planes** (`services`, `service_plans`, `service_plan_lines`) | 1 | Desde `product.template` de Odoo. Conciliar por `odoo_default_code`. |
| 3 | **Identidad** (`auth.users` → `usuarios` → `user_roles`) | — | **Dedup primero** (dry-run). Genera `id_map(entity='user')`. |
| 4 | **Empresas** (`companies` + `company_addresses`) | 3 | `user_id` desde `id_map`. |
| 5 | **Personas** (`members` + `company_members` + `member_addresses`) | 3, 4 | `company_members.percentage` debe sumar 100 por empresa. |
| 6 | **Proceso** (`workflow.incorporation_workflows` + `incorporation_forms`) | 4 | Estado del caso desde Sheets. |
| 7 | **Comercial** (`orders` + `order_lines` + `pagos`) | 3, 4, 2 | Conciliar Odoo `sale.order`/`account.move` ↔ Stripe. |
| 8 | **Referidos** (`referidos`) | 3 | `partner_id` y `referido_id` desde `id_map`. |
| 9 | **Documentos** (`documents.*`) — *opcional, fase posterior* | 4, 5 | Solo si se migran adjuntos. |

---

## 5. Mapeo de campos por entidad (con enums y FKs)

### 5.1 Cliente → `auth.users` + `usuarios`
| Destino (`usuarios`) | Origen | Transformación |
|---|---|---|
| `user_id` | (generado por Auth Admin API) | `email → uuid` en `id_map` |
| `correo` | email | `lower(trim())` — **clave natural de dedup** |
| `nombre` / `apellido` | nombre / apellido | split si viene completo |
| `pais_id` | país (texto) | `dict_country` → `countries.id` |
| `telf`, `ciudad`, `direccion_linea1/2`, `codigo_postal` | directos | trim |
| `tipo_identificacion`, `numero_de_identificacion`, `tipo_persona` | ID del intake | normalizar |
| `odoo_partner_id` | `res.partner.id` | guardar para trazabilidad |
| rol | — | insertar `user_roles` con rol `cliente` |

### 5.2 Empresa → `companies` (enums obligatorios)
| Destino | Origen | Valores permitidos / regla |
|---|---|---|
| `legal_name` | nombre elegido (Sheets) o `nombre_1` (Cognito) | trim |
| `entity_type` *(enum)* | tipo de negocio | **`llc` · `lp` · `c-corp`** |
| `management_type` *(enum)* | forma administración | **`member-managed` · `manager-managed`** |
| `legal_status` *(enum)* | estado del caso | **`draft` · `pending_validation` · `pending` · `active` · `inactive` · `suspended` · `dissolved`** |
| `formation_state_id` | estado EE.UU. | lookup (n8n) → `states.id` |
| `formation_country_id` | país | lookup (n8n) → `countries.id` |
| `activity_code_id` | actividad | resolver contra `activity` (IRS) |
| `activity_description`, `tax_clasification` | directos | texto |
| `us_source_income`, `joint_ownership` | sí/no | → `boolean` |
| `incorporation_date` | fecha | → `date` |
| `identification_number` (EIN), `filing_number` | si existe | texto |
| `user_id`, `created_by` | cliente dueño | uuid encadenado en runtime (del `user` insertado) |
| **Direcciones** → `company_addresses` | dirección legal/operativa | `type` ∈ `legal`/`operating`; `city` y `country_id` obligatorios; `country_id`/`state_id` por lookup |

### 5.3 Persona → `members` + `company_members`
| Destino (`members`) | Origen | Valores permitidos / regla |
|---|---|---|
| `person_type` *(enum)* | natural/jurídica | **`natural_person` · `juridical_person`** |
| `identification_type` *(enum)* | tipo doc | **`passport` · `national_id` · `driver_licence` · `ein`** |
| `marital_status` *(enum)* | estado civil | **`single` · `married` · `widowed` · `divorced` · `legally_separated` · `civil_union` · `annulled`** |
| `first_name`/`last_name`/`full_name` (natural) o `name` (jurídica) | nombre | derivado de `person_type` |
| `country_nationality_id`, `country_residence_id`, `country_id` | países | lookup (n8n) → `countries.id` |
| `ssn`, `itin`, `identification_number`, `birth_date` | directos | `birth_date`→`date` |
| **Relación** → `company_members` | — | `company_id`+`member_id` encadenados en runtime; `start_date`/`end_date` (no `date_*`), `percentage numeric`, `is_member`, `is_manager` |

> **Regla de integridad:** `SUM(company_members.percentage)` por `company_id` = **100** (gate de validación, §7).

### 5.4 Comercial → `orders` / `order_lines` / `pagos`
- `pagos`: `user_id`, `servicio_id`, `amount`, `status`, `stripe_payment_intent_id`, `odoo_invoice_id`, `odoo_sale_order_id`, `source`.
- `orders`: `client_id` (=`id_map`), `order_number` (de Odoo `sale.order.name`), `payment_id` (→`pagos`), `total`, `service_plan_id`.
- `order_lines`: una por producto de la `sale.order` (`service_id`, `quantity`, `unit_price`, `subtotal`, `total`).
- **Conciliación:** una orden Odoo y su factura deben empatar contra el pago Stripe por monto y partner. Conflictos → reporte manual.

---

## 6. Estrategia de identidad y deduplicación

| Entidad | Clave natural (dedup) | Clave secundaria |
|---|---|---|
| Cliente | `lower(trim(email))` | teléfono normalizado E.164 |
| Empresa | `normalize(legal_name)` por dueño | EIN / `filing_number` |
| Persona | `identification_number` | `lower(full_name)` + `birth_date` |
| Pago | `stripe_payment_intent_id` o `odoo_invoice_id` | (monto + fecha + cliente) |

**Proceso (en n8n / CSV, sin tablas en la DB):**
1. Exportar cada fuente a CSV.
2. **Matching cruzado** (Odoo email ↔ Cognito email ↔ Sheet email) en n8n → CSV de conciliación con `match_confidence`.
3. **Dry-run report:** filas únicas, colisiones, sin-email, huérfanos. **Revisión humana** antes de cargar identidad.
4. Cargar con **UPSERT sobre la clave natural** (email). Re-importar el CSV → cero duplicados (no se requiere `id_map`: la identidad se encadena dentro de cada contrato JSON).

---

## 7. Validación / reconciliación (gates de calidad)

Ejecutar como SQL al final de cada bloque; bloquear avance si fallan:

- **Conteos:** filas del CSV de origen vs filas en destino por entidad (descontando duplicados conocidos).
- **FKs huérfanas:** toda `companies.user_id`, `company_members.member_id/company_id`, `orders.client_id`, `pagos.user_id` resuelve.
- **Porcentajes:** `SUM(percentage)=100` por empresa.
- **Enums:** cero valores fuera de dominio (validado por el cast a enum).
- **Dinero:** `SUM(pagos.amount)` por cliente ≈ total facturado en Odoo; desvíos → reporte.
- **Unicidad:** sin emails repetidos en `usuarios`; sin `stripe_payment_intent_id` repetido.
- **Spot-check:** muestra de N casos comparada manualmente contra la fuente.

---

## 8. Fases de ejecución (timeline)

| Fase | Entregable | Gate de salida |
|---|---|---|
| **F0 — Preparación** | Contrato JSON corregido (§3.1) + tablas de equivalencia en n8n (enum/país/estado) + **export CSV congelado** con fecha de corte | Equivalencias cubren 100% de valores observados |
| **F1 — Catálogos + servicios** | `services`/`service_plans` conciliados con Odoo | Catálogo completo y con precios |
| **F2 — Identidad (dry-run → carga)** | Reporte de dedup revisado + `auth.users`/`usuarios`/`user_roles` cargados | 0 huérfanos, 0 emails dup |
| **F3 — Empresas + personas + direcciones** | `companies`, `members`, `company_members`, `*_addresses` | % suma 100, enums válidos |
| **F4 — Proceso** | `workflow.incorporation_workflows` con estado por caso | Cada empresa con caso/estado |
| **F5 — Comercial** | `orders`/`order_lines`/`pagos` + reconciliación Odoo/Stripe | Cuadre de montos |
| **F6 — Referidos (+ documentos opc.)** | `referidos` | Partners enlazados |
| **F7 — Cutover + cierre** | Repuntar `.from()` legacy→nuevo, validación final, **congelar fuentes** | App lee el modelo nuevo |

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Clientes sin email → no hay clave de dedup | Regla de fallback (nombre+tel) marcada para revisión manual; no auto-merge |
| Texto libre no mapea a enum | Tablas de equivalencia exhaustivas en n8n (F0); cast falla ruidosamente, no en silencio |
| País/estado como texto inconsistente | Lookup con sinónimos en n8n; default a NULL + flag, nunca adivinar |
| RLS bloquea inserts | Cargar con **service role** (n8n) / `supabaseAdmin`; nunca con anon key |
| `auth.users` duplicados | Crear vía Admin API; **UPSERT por email** → re-run hace lookup, no recrea |
| Pagos no cuadran Odoo↔Stripe | `odoo_invoice_id`/`stripe_payment_intent_id` como claves; desvíos a reporte manual |
| Doble fuente de verdad (Odoo vs Sheets) | Regla explícita en §2; enriquecer, no sobrescribir el campo "dueño" |
| Tablas destino aún en nombre legacy (clientes/pagos/facturación) | Cargar a la tabla actual; el rename del [standardization-plan](standardization-plan.md) no toca la data |
| Bug activo `api/billing/upsert-invoice.ts` (`facturacion` no existe) | Corregir a `datos_facturacion` antes del cutover comercial |
| Pérdida de datos por re-run | Idempotencia vía UPSERT por clave natural; el CSV congelado es la fuente re-importable |
| Contrato JSON desalineado con el esquema | Aplicar las correcciones de §3.1 antes de construir el workflow |

---

## 10. Entregables que puedo generar a continuación

1. **Contrato JSON corregido** (`migrations/cognito-forms-company.json`) con `members[]`, nombres de columna reales y bloque `_meta`.
2. **Esqueleto del workflow n8n**: leer CSV → mapear (enums/lookups) → construir el JSON → carga encadenada (Auth Admin API → company → members → company_member) con UPSERT.
3. **Tablas de equivalencia** (enum / país→`countries.id` / estado→`states.id`) para los nodos de n8n.
4. **Queries de validación** (§7) listas para correr post-carga.
5. **Reporte de dedup (dry-run)** sobre los CSV reales una vez disponibles.

---

## 11. Estrategia de migración de documentos (binarios)

Los documentos son **archivos**, no metadata: hay que **descargar el binario de la fuente, subirlo a Supabase Storage y registrar la fila** en `documents.documents`. n8n es ideal porque tiene nodos para las dos fuentes y para Storage.

### 11.1 Fuente de binarios: campos de archivo de Cognito

Los binarios se extraen de los **campos de archivo del formulario** (los arrays `[]`: `FacturaDeServicioBásico`, `ArticulosDeIncorporacion`, `DocumentosFirmados.*`, `CierreDeProceso.*`, `EnviarDocumentosParaFirma.*`, etc.). Cada campo poblado es un array de objetos de archivo Cognito (`Id`, `Name`, `ContentType`, `Size`, enlace de descarga). n8n hace `GET` de la entry vía **Cognito Forms API** (Bearer) y descarga cada archivo por su enlace.

- En la entrada de ejemplo (#181, `Status: Incomplete`) los arrays están **vacíos** → solo migran entries con archivos.
- `Entry.Document12` es el **PDF snapshot** de la propia entrada → archivable como `supporting`/`internal_reference`.
- `DetallesDelCliente.CarpetaDrive` es solo **referencia operativa** (carpeta Drive del equipo); **fuera del alcance** de esta migración de binarios.

### 11.2 Destino: bucket `documents` (capa gestionada) + `documents.documents`

Replicar el patrón de escritura de `uploadDocument` ([service.ts:165](src/domains/documents/service.ts:165)), pero con la **estructura de buckets objetivo** (tu diagrama, §11.8):

- **Bucket:** `documents` (privado, gestionado). Path **por entidad** (no el viejo `…/companies/{id}/documents/…`):
  - Doc de empresa → `{user_id}/companies/{company_id}/{documentId}-{safeName}`
  - Doc de socio (pasaporte/utility) → `{user_id}/members/{member_id}/{documentId}-{safeName}`
  - Doc de factura/orden → `{user_id}/invoices/{order_id}/{documentId}-{safeName}`
- **Fila `documents.documents`** (columnas `NOT NULL` clave): `document_type_id`, `file_name`, `bucket_storage`, `bucket_path`, `file_size_bytes`, `status`, `visibility`, `is_sensitive`, `version=1`, `uploaded_by`. Setear además `mime_type`, `content_hash` (sha256 — para dedup), `case_id` (workflow/incorporación o `null`), `notes` (fuente: `cognito:{field}`).

> Los reads de la app usan `documents.bucket_path` de la fila (no recalculan el path), así que cargar con el esquema nuevo **funciona aunque `buildStoragePath` aún no esté alineado** (ver §11.8).
- **Fila `documents.document_links`** (polimórfica): `related_to_type` + `related_to_id` + `relation_purpose` + `is_primary`. Documentos de empresa → link a `company`; pasaporte/ID/utility de un socio → link adicional a `member`.
- **Visibilidad (decidida):** los **entregables** se cargan `client_visible` **+ se crea `document_shares`** (activo) para el dueño; el resto entra `internal_only`. Cerrar siempre con un `document_events` `uploaded` (y `shared` para los entregables).

**Entregables → `client_visible` + share:** Confirmación EIN (CP575), Carta EIN 147C, Artículos/Certificado de incorporación, Operating Agreement, Form SS-4, Confirmación BOIR, Carta bancaria.
**Resto → `internal_only`:** disclaimers/acknowledgments, comprobantes de pago, informe de planificación, PDF snapshot de la entry, y documentos KYC de socios (pasaporte/utility — sensibles).

### 11.3 Prerrequisitos (F0)

- **`documents.document_types` — mínimo viable, NO la taxonomía completa todavía.** `document_type_id` es `NOT NULL`, así que se necesita **al menos un tipo**. Crear **un placeholder** (`code=999`, `name='Sin clasificar (migración)'`, `legal_category='supporting'`, `applies_to='generic'`, `requires_approval=false`) y asignarlo a todos los documentos migrados, guardando el **slot Cognito real** en `file_title`/`notes`. La clasificación fina (mapa §11.5) se hace después con un `UPDATE` (§11.7), **sin re-subir binarios**.
- **Usuario de servicio "migration"** (uuid en `auth.users`/`usuarios`, rol admin) para `uploaded_by`/`created_by` (`NOT NULL`).
- **Subir el límite del bucket `documents`:** hoy `2 MB` (ver [storage-buckets.md](../storage-buckets.md)) → **insuficiente** para PDFs escaneados. Subir a ≥10 MB. El `allowed_mime_types` (pdf/jpg/png/webp) ya cubre lo que Cognito permite subir.
- **Resolver `company_id` + `user_id`** por entrada desde el contrato de datos ya cargado (key por `Cliente` `CLI…`, `CodigoFactura` `FAC…`, `Odoo.IdCliente/IdRegistroIncorporacion/IdOrden`).

### 11.4 Pipeline n8n por entrada (idempotente)

Para cada entrada Cognito:
1. Resolver `user_id` + `company_id` (de la data ya migrada).
2. Reunir binarios: campos de archivo Cognito **+** archivos del folder Drive.
3. Por cada archivo:
   a. Descargar bytes (Cognito API / Drive).
   b. `content_hash = sha256(bytes)`. **Dedup:** si ya existe un `documents.documents` con ese hash para esa company → **skip** (idempotencia).
   c. Determinar `document_type_id` por el slot (Cognito) o por heurística de nombre de archivo (Drive); ambiguos → cola de revisión manual.
   d. `documentId = uuid()`; subir a `documents` (service role, `upsert:false`) en el path canónico.
   e. Insertar `documents.documents` (`status`: `approved` para entregables finalizados / `uploaded` para crudos; `visibility` = `client_visible` si es entregable (§11.2) si no `internal_only`; `is_sensitive=true`; `content_hash`; `notes` con la fuente).
   f. Insertar `document_links` (company y, si aplica, member).
   g. Si es entregable: `document_shares` (activo, dueño) + `document_events` `shared`.

### 11.5 Mapa campo Cognito → tipo de documento

| Slot / campo Cognito | Tipo | `legal_category` | Link | `relation_purpose` |
|---|---|---|---|---|
| `FacturaDeServicioBásico` | Comprobante de domicilio (empresa) | `address` | company | `support` |
| `ArticulosDeIncorporacion` / `ConstanciaDeIncorporación` | Artículos / Certificado de incorporación | `registry` | company | `filing` |
| `OperatingAgreement` / `AcuerdoDeOperacion` | Operating Agreement | `corporate` | company | `signature` |
| `FormularioSS4` / `FormSS4` | Form SS-4 | `tax` | company | `filing` |
| `ContratoDeOfficer` / `ContratoOfficer` | Contrato de officer | `corporate` | company | `signature` |
| `Disclaimer…` / `ClientAcknowledgment…` | Disclaimer / acknowledgment | `compliance` | company | `signature` |
| `DocumentoEIN` (CP575) | Confirmación EIN | `tax` | company | `filing` |
| `EINVerificationLetterCarta147C` | Carta EIN 147C | `authority` | company | `filing` |
| `RegistroBOIR` / `NotificarBoir` | Presentación BOIR | `compliance` | company | `filing` |
| `CartaBancaria` | Carta bancaria | `banking` | company | `support` |
| `ComprobanteDePago` | Comprobante de pago | `supporting` | company | `support` |
| `Formulario8832` / `CertificadoDeRecepciónForm8832` | Form 8832 | `tax` | company | `filing` |
| `CumplimientoBEA.ComprobanteDePresentación` | Presentación BEA | `compliance` | company | `filing` |
| `ComprobanteCambioAgenteResidente` | Cambio de agente residente | `registry` | company | `support` |
| `InformePlanificacion` | Informe de planificación y diseño | `supporting` | company | `internal_reference` |
| `Firma.Firma` | Firma | `corporate` | company | `signature` |
| `Entry.Document12` | PDF snapshot de la entrada | `supporting` | incorporation_case | `internal_reference` |
| Socio: pasaporte / ID | Pasaporte / documento de identidad | `identity` | member | `kyc` |
| Socio: utility | Comprobante de domicilio (socio) | `address` | member | `support` |

### 11.6 Riesgos específicos de documentos

| Riesgo | Mitigación |
|---|---|
| Límite 2 MB del bucket `documents` vs PDFs escaneados | Subir `file_size_limit` antes de migrar (§11.3) |
| Rate limits / paginación de la Cognito Forms API | Procesar en lotes con reintentos; respetar paginación de entries |
| Entries sin archivos (ej. #181 `Incomplete`) | Filtrar: solo entries con campos de archivo poblados |
| Re-run duplica archivos | `content_hash` (sha256) como clave de dedup; `notes` con fuente |
| `uploaded_by` `NOT NULL` y autor original desconocido | Usuario de servicio "migration" |
| `case_id` apunta a `empresas_incorporaciones` (modelo actual) | En el nuevo modelo: `null` + apoyarse en `document_links` (polimórfico) |

### 11.7 Orquestación: empresas y documentos en dos pasadas

**No reusar el endpoint `/api/documents/upload`.** Está acoplado al modelo legacy: `getCaseOwner` ([service.ts:51](src/domains/documents/service.ts:51)) resuelve el dueño desde `empresas_incorporaciones` y hace `404` si no hay fila — una `company` nueva sin caso legacy no pasa. Además exige actor staff autenticado y `multipart` de a un archivo. Para un lote contra el esquema nuevo, **n8n replica las escrituras con service role** (Storage upload + `insert` en `documents`/`document_links`/`document_shares`), tal cual el patrón de `uploadDocument`.

**Recomendado: dos pasadas desacopladas, no un mega-paso por entry.** Los documentos dependen del `company_id`/`user_id` que produce la carga de empresas, pero acoplarlos al mismo workflow mezcla modos de fallo distintos (rate-limit de Cognito, archivo > límite del bucket) con la carga de datos. Separar da aislamiento de fallos e idempotencia independiente:

| Pasada | Qué hace | Entrada → Salida |
|---|---|---|
| **1 · Datos** | Contrato JSON por entry → `user`/`company`/`members`/`company_members` (UPSERT por email) | Emite **CSV de mapeo** `entry_number → user_id, company_id, member_ids[]` (n8n captura el `company_id` del insert) |
| **2 · Documentos** | Por cada entry **con archivos**: resolver `company_id`/`user_id` del CSV del paso 1 → descargar de Cognito → sha256/dedup → upload al bucket → `insert` `documents` (+`links` +`share` si entregable) | Documentos con `document_type_id` = **placeholder** |
| **3 · Reclasificación** *(después, cuando exista el catálogo)* | `UPDATE documents SET document_type_id = <real>` según el slot Cognito guardado en `notes`/`file_title` | Sin tocar binarios |

> **Join entre pasadas:** la clave robusta es el **número de entry de Cognito** (`Entry.Number`). Como `companies` no tiene columna para guardarlo, el **CSV de mapeo** del paso 1 es el puente. Fallback: resolver por `user_id` (email) + `legal_name`.

Esto también permite **diferir documentos por completo**: si prefieres, corre solo la pasada 1 ahora (empresas) y la 2 cuando definas el catálogo real — el modelo no se rompe porque nada en empresas/socios depende de los documentos.

### 11.8 Estructura de buckets objetivo (de tu diagrama) y alineación de código

**3 buckets** (reemplaza la spec de [storage-buckets.md](../storage-buckets.md)):

```
documents (privado)                  incorporation_documents (privado, intake)
└── {user_id}/                       └── {user_id}/
    ├── companies/{company_id}/          ├── temp/
    ├── members/{member_id}/             └── incorporations/{incorporation_id}/
    └── invoices/{order_id}/                 ├── company/        (service-bill.pdf, certificate.pdf)
                                             ├── members/{member_id}/  (passport, utility)
public-assets (público)                      ├── temp/
├── avatars/{user_id}/                       └── signature.png
├── documents/
└── branding/
```

**Divergencias vs. la spec actual** (a conciliar):

| Spec actual (`storage-buckets.md`) | Tu diagrama |
|---|---|
| `documentos_empresas` (intake) | renombrado → **`incorporation_documents`** |
| `documents`: `{userId}/companies/{companyId}/documents/{uuid}-{name}` | **`{user_id}/{companies\|members\|invoices}/{id}/…`** (sin sufijo `/documents/`; agrega `members/` e `invoices/`) |
| `avatars` (bucket propio) | movido a **`public-assets/avatars/`** |
| `empresa-logos` (bucket propio) | presumiblemente → **`public-assets/branding/`** |
| `templates` (bucket privado) | **no aparece** en el diagrama — confirmar si se mantiene aparte |

**Alineación de código pendiente** (no bloquea la migración, pero sí las subidas nuevas de la app):
- `buildStoragePath` ([service.ts:35](src/domains/documents/service.ts:35)) genera el path viejo → actualizar al esquema por entidad.
- `api/users/update-avatar.ts` y `api/companies/update-avatar.ts` apuntan a `avatars`/`empresa-logos` → repuntar a `public-assets`.
- Actualizar `storage-buckets.md` (fuente de verdad) a esta estructura + crear/renombrar buckets en Supabase con sus límites y `allowed_mime_types`.

**Migración:** n8n escribe el `bucket_path` con el esquema nuevo; reads OK desde el día 1. La alineación de código es un cutover separado.

---

### Anexo — Diccionario de enums destino (valores exactos)

```
companies_entity_type      : llc | lp | c-corp
companies_management_type  : member-managed | manager-managed
companies_legal_status     : draft | pending_validation | pending | active | inactive | suspended | dissolved
members_person_type        : natural_person | juridical_person
members_identification_type: passport | national_id | driver_licence | ein
members_marital_status     : single | married | widowed | divorced | legally_separated | civil_union | annulled

document_status            : pending | uploaded | under_review | approved | rejected | replaced | expired | archived
document_category          : identity | address | corporate | tax | compliance | authority | banking | registry | supporting
document_applies_to        : user | profile | member | company | incorporation_case | workflow | generic
document_related_to_type   : user | profile | member | company | incorporation_case | workflow
document_relation_purpose  : owner | support | attachment | kyc | filing | signature | internal_reference
```
