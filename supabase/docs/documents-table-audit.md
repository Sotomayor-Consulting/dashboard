# Auditoría `documents.document_types` / `documents.documents` — depuración y pregunta abierta

**Proyecto:** APP-SCI dev (`ceuofnjslxjoqtqxbfqt`) · prod (`juftdhznquzwvfzrrjqy`)
**Fecha:** 2026-08-07
**Método:** Revisión de código (`src/domains/documents`, `src/domains/templates`, islands/rutas de documentos), inspección de schema/datos reales vía MCP de Supabase, y de triggers/RLS policies en Postgres.

---

## 1. Resumen ejecutivo

Se depuró el catálogo `documents.document_types` (40 → 34 tipos), se agregó
`documents.documents.is_signed`, y se corrigió un bug real de datos
huérfanos por falta de `document_links`. De paso se auditaron 3 columnas más
de `documents.documents` contra YAGNI/KISS: dos (`content_hash`,
`is_sensitive`) eran código muerto y ya se eliminaron; la tercera
(`visibility`) **parecía** redundante desde el código de la app pero resultó
tener un trigger y 3 RLS policies reales dependiendo de ella — se revirtió
el intento de eliminarla y queda **pendiente de una decisión** (ver §6).

Todo lo aplicado hasta ahora corrió únicamente contra **dev**. Prod tiene
`0` filas en `documents.documents`/`documents.document_requests`, así que
replicar ahí es de bajo riesgo, pero requiere confirmación explícita antes
de ejecutarse (no se ha tocado prod en ningún momento).

---

## 2. Migraciones aplicadas en dev (pendientes en prod)

| Archivo | Contenido |
|---|---|
| `20260807211154_document_types_drop_code_add_slug.sql` | Quita `document_types.code` (int, usado a mano como prefijo 1xxx/2xxx/3xxx/9xxx de `applies_to`); agrega `slug text unique` solo poblado para el tipo "Other" (`'other_generic'`), reemplazando el lookup funcional que antes usaba `code=9001`. |
| `20260807211201_document_types_dedupe_and_signed_flag.sql` | Renombra id 19 a "Factura de Servicio Básico (Incorporación)" (desambigua de id 8, mismo nombre, documento distinto). Reasigna a id 23 las filas de `documents.documents`/`document_requests` que apuntaban a id 2 (duplicado conceptual de id 23) y lo borra. Borra los 5 tipos "(Firmado)" (ids 36-40) — la firma pasa a ser un atributo del archivo, no un tipo de catálogo. Agrega `documents.documents.is_signed boolean not null default false`. |
| `20260807214824_documents_drop_unused_columns.sql` | Elimina `content_hash` e `is_sensitive` de `documents.documents` — cero referencias en todo `src/`, sin triggers/policies dependientes (confirmado antes de aplicar). |

Catálogo resultante: **34 tipos**, agrupados solo por `legal_category` (ya
no por prefijo numérico) en toda la UI.

---

## 3. `is_signed`

Reemplaza el patrón "tipo X" + "tipo X (Firmado)" del catálogo. Vive en
`documents.documents` (no en `document_types`): cualquier tipo puede tener
una versión firmada y otra sin firmar del mismo archivo.

- Se setea al subir desde `CompanyDocumentsUploadManager.tsx` (checkbox
  "Está firmado", `Checkbox` de Base UI con `value="true"`, mismo patrón que
  `FormSignIn.tsx`).
- El flujo legado "documento por firmar" (`upload-signed.ts` — status
  `pending`→`uploaded`, activo y wireado en `CompanyDocumentsDashboard.astro`
  y `CompanyDashboard.astro`) también marca `is_signed: true` al recibir el
  archivo firmado — una sola línea agregada a su `.update()` existente, sin
  tocar su lógica de `status`/`pending-signature.ts`/`SignedPanel.astro`.

---

## 4. Bug corregido: documentos huérfanos por `document_links` faltante

`document_links` es la **única** forma en que el front encuentra un
documento — `getDocumentsForRelated()` en
`src/domains/documents/document_dashboard.ts` arranca el query `FROM
document_links`, nunca desde `documents.documents` directamente.
`documents.documents.case_id` no se usa para listar en ningún lado (solo
como caché de conveniencia en un par de funciones de `service.ts` que ya
conocen el `document_id`).

**Causa raíz:** `uploadDocument()` (`service.ts`) y `uploadTemplateFile()`
(`templates.ts`) insertaban el documento y su link como dos llamadas
separadas sin rollback. Si la segunda fallaba, el archivo y la fila ya
estaban confirmados — huérfanos para siempre (un retry generaba un
`documentId` nuevo cada vez, sin limpiar el anterior).

**Evidencia real en dev:** 5 filas huérfanas, todas del flujo de
plantillas, con sus `document_templates` padre ya borrados (y
`deleteTemplateFile()` hace no-op silencioso cuando no encuentra el link,
así que ni el borrado del template las limpió). Ya se eliminaron (y sus
archivos de storage, que ya no existían).

**Fix:** nuevo helper `insertDocumentWithLink()` en
`src/domains/documents/helpers.ts` — inserta el documento, intenta insertar
el link, y si falla borra el documento recién creado + el archivo de
storage antes de relanzar el error. Usado por `uploadDocument()` y
`uploadTemplateFile()`. No se tocó `upload-contract.ts` (nombre de archivo
fijo, un solo documento por partner, riesgo mínimo) ni `upload-signed.ts`
(no crea documentos nuevos, solo actualiza uno existente).

---

## 5. Columnas eliminadas: `content_hash`, `is_sensitive`

- `content_hash` (char(64)): cero referencias en todo `src/` — ni se
  escribía ni se leía. Preparada para una feature de deduplicación que
  nunca se construyó.
- `is_sensitive` (boolean): solo se escribía, hardcodeada distinta en 3
  sitios (`true` en `service.ts`, `false` en `templates.ts` y
  `upload-contract.ts`), nunca se leía en ningún lado.

Ambas confirmadas sin triggers/RLS dependientes antes de aplicar el `DROP
COLUMN` — a diferencia de `visibility` (§6).

---

## 6. `visibility` — pendiente, requiere decisión antes de tocarla

### Por qué parecía redundante (análisis solo de código)

`shareDocumentWithUser()` y el auto-share de `uploadDocument()` en
`service.ts` siempre fuerzan `visibility='client_visible'` en simultáneo a
crear un share, y el filtro de lectura en `document_dashboard.ts` ya exige
un share activo además de la visibilidad. Con los datos reales de dev: 0
filas `client_visible` sin share activo, 0 filas `internal_only` con share
activo — 100% correlacionado.

### Por qué NO se puede eliminar sin más

Al intentar `alter table documents.documents drop column visibility`,
Postgres lo rechazó:

```
ERROR: cannot drop column visibility of table documents.documents because other objects depend on it
DETAIL:
  trigger trg_documents_auto_share_client_visible on table documents.documents depends on column visibility
  policy document_approvals_select_access on table documents.document_approvals depends on column visibility
  policy document_links_select_access on table documents.document_links depends on column visibility
  policy documents_select_access on table documents.documents depends on column visibility
```

- **Trigger** `documents.auto_share_on_client_visible()` (`SECURITY
  DEFINER`, `AFTER INSERT OR UPDATE OF visibility`): cuando `visibility`
  pasa a `'client_visible'`, inserta/reactiva automáticamente un
  `document_shares` para el **dueño del caso** (`incorporations.user_id`),
  sin pasar por `service.ts`. Esto es infraestructura de BD, invisible desde
  `src/`.
- **3 RLS policies** (`documents_select_access`,
  `document_links_select_access`, `document_approvals_select_access`)
  usan `visibility='client_visible' AND EXISTS(share activo)` como
  autorización **real a nivel de Postgres** — no un filtro de conveniencia
  de la app. El `.filter()` de `document_dashboard.ts` es un espejo de
  esto, no la fuente de verdad.
- `visibility` es `NOT NULL DEFAULT 'internal_only'`. Si la app dejara de
  setearla (como se intentó en un primer paso, luego revertido), todo
  documento nuevo quedaría en `internal_only` para siempre — el trigger no
  dispararía y las RLS policies bloquearían a cualquier cliente sin importar
  los shares explícitos creados por la app. Se revirtió antes de que esto
  llegara a `pnpm dev`/producción.

### Lo que falta para decidir

`service.ts` ya tiene comentarios documentando que `documents.documents`
puede recibir **imports externos directos vía REST API/PostgREST (p. ej.
n8n)** con `case_id` nulo (ver `resolveCaseIdForDocument`). No se pudo
confirmar si algún proceso externo de ese tipo depende de setear
`visibility='client_visible'` directamente para que el trigger comparta el
documento con el dueño del caso — si es así, borrar la columna sin
reemplazar ese mecanismo cortaría en silencio el acceso de clientes a
documentos importados así.

**Antes de retomar esta fase:**
1. Confirmar con quien mantiene el/los workflows de n8n (o el import
   externo que corresponda) si escriben `visibility` directamente.
2. Si no depende nadie externo: reescribir las 3 RLS policies para usar
   solo `document_shares.share_status='active'`, retirar el trigger, y
   recién ahí eliminar la columna y el enum `documents.document_visibility`
   — repitiendo el mismo patrón que Fase A/C pero a nivel de Postgres, no
   solo de `src/`.
3. Si sí depende algo externo: mantener `visibility` y el trigger tal cual
   están; a lo sumo documentar que es intencional (columna = interruptor de
   auto-share para imports externos) y dejar de simplificarla desde la app.

Todo el código de la app relacionado a `visibility` sigue exactamente como
estaba antes de esta sesión (se revirtió el intento de eliminarla) —
`astro check` en 0 errores.
