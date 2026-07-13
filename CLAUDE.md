# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dashboard SSR para **Sotomayor Consulting** — gestión de LLCs, partners, facturación e incorporaciones. Construido con **Astro 6** en modo SSR (`output: 'server'`) con adapter Node.js standalone, Supabase como backend (auth + DB), Tailwind CSS v4 con shadcn/ui (Base UI) como primitivas de componentes y elementos nativos (`<dialog>`, `<details>`) para overlays.

## Commands

```bash
pnpm install          # Instalar dependencias (usa pnpm con node-linker=hoisted)
pnpm dev              # Dev server (puerto 4321)
pnpm build            # astro check && astro build --force
pnpm preview          # Preview del build SSR
npx prettier --write . # Formatear código (config en prettier.config.mjs)
```

No hay test runner configurado actualmente.

## Architecture

### SSR & Rendering

Todo es server-rendered por defecto (`output: 'server'` en `astro.config.mjs`). No se necesita `prerender = false` explícito.

Los archivos `.client.ts` en modules contienen código que se ejecuta en el browser. Estos archivos:
- Guardan acceso al DOM con `document.getElementById(...)` checks.
- Escuchan el evento custom `dark-mode` para re-renderizar charts/UI con colores actualizados.
- Importan paquetes npm directamente (bundled por Vite).

Alpine.js se usa para interactividad ligera en el cliente.

### Page Composition Pattern

Las pages son extremadamente thin — importan un layout + un módulo y los componen. Toda la lógica vive en el módulo o el layout:

```astro
---
import LayoutSidebar from '@layouts/LayoutSidebar.astro';
import Dashboard from '@modules/dashboard/Dashboard.astro';
---
<LayoutSidebar>
  <Dashboard />
</LayoutSidebar>
```

### Path Aliases (tsconfig.json)

| Alias | Path | Propósito |
|---|---|---|
| `@layouts/*` | `src/layouts/*` | Layouts maestros |
| `@components/*` | `src/components/*` | Componentes reutilizables atómicos |
| `@modules/*` | `src/modules/*` | Features completas por dominio |
| `@domains/*` | `src/domains/*` | Capa de acceso a datos por dominio |
| `@infrastructure/*` | `src/lib/infrastructure/*` | Plomería técnica (auth, supabase, etc.) |
| `@integrations/*` | `src/lib/integrations/*` | Servicios externos (odoo, carbone) |
| `@shared/*` | `src/lib/shared/*` | Utilidades transversales |
| `@third-party/*` | `src/lib/third-party/*` | Vendored libs (alpinejs, surveyjs, etc.) |
| `@assets/*` | `src/assets/*` | Imágenes y recursos |
| `@styles/*` | `src/styles/*` | Estilos globales |

### Key Directories

```
src/
├── pages/                    # Required (Astro). Rutas. Pages thin que importan layout + módulo.
│   └── api/                  # API routes organizadas por dominio (ver §API Routes)
├── layouts/                  # Layouts maestros (Astro convention)
├── components/               # Componentes reutilizables atómicos
│   ├── ui/                   # shadcn/ui primitives (.tsx)
│   ├── forms/                # Inputs reutilizables
│   ├── feedback/             # Banners, alerts, notifications
│   ├── display/              # Cards, dropzones, prints
│   └── navigation/           # SideBar, NavBar, GlobalSearch, BreadcrumbPath, TabBar, items.ts
├── modules/                  # Features por dominio con molde uniforme
│   └── <feature>/
│       ├── <Page>.astro      # Entrypoint(s) consumido(s) por src/pages
│       ├── <name>.client.ts  # JS de browser
│       ├── components/       # .astro hijos del módulo
│       ├── islands/          # .tsx hidratados con client:* (terminología Astro)
│       ├── services/         # get-xxx-page-data.ts — agregadores SSR
│       └── types.ts
├── domains/                  # Capa de acceso a datos por dominio (ex-tables/)
│   ├── companies/            # companies.ts, incorporations.ts, members.ts, managers.ts, active-cookie.ts
│   ├── documents/            # documents.ts, pending-signature.ts, user-documents.ts, document_dashboard.ts, service.ts, helpers.ts, types.ts, templates/
│   ├── users/                # users.ts, notifications.ts, billing.ts, menu.ts
│   ├── payments/             # payments.ts, unread.ts (leen schema orders.*)
│   ├── partners/referrals.ts
│   ├── forms/                # forms.ts, submittedForms.ts
│   ├── services/services.ts
│   ├── workflow/index.ts
│   ├── utils/generals/       # activities.ts, states.ts, microservices.ts, countries-list.ts
│   └── countries.ts
├── lib/
│   ├── infrastructure/       # Plomería técnica
│   │   ├── auth/             # AuthService, config, helpers, types
│   │   ├── supabase/         # createSupabaseServerClient, supabaseAdmin, supabaseBrowser
│   │   ├── security/         # SECURITY_HEADERS, safeBack
│   │   ├── email/            # mailer.ts (nodemailer config) + send-email.ts (high-level API)
│   │   ├── notifications/    # service.ts, channels/{email,in-app}.ts, renderer, templates, types
│   │   ├── logging/          # logger.ts (Winston) + createLogger(context) — solo servidor
│   │   └── storage/          # user-folders.ts (lectura buckets Supabase)
│   ├── integrations/         # Servicios externos
│   │   ├── odoo/             # client.ts, axios-odoo-instance.ts, partners.ts (referidos)
│   │   └── carbone.ts        # Generación de documentos vía microservicio
│   ├── shared/               # Utilidades transversales
│   │   ├── data.ts           # url(), asset(), fetchData() helpers
│   │   ├── roles.ts          # ROLES constants, isAdmin(), isPartner(), etc.
│   │   ├── cookies.ts        # ACTIVE_COMPANY_COOKIE, etc.
│   │   ├── validation/       # form-validator.ts
│   │   └── schemas/          # personal-info.schema.ts (Zod)
│   └── third-party/          # Código vendored (excluido de TS)
│       ├── alpinejs/   dropzone/   simple-data-tables/   surveyjs/
├── actions/                  # Astro Actions (defineAction)
├── assets/                   # Imágenes optimizadas
├── icons/                    # SVGs locales (convención de astro-icon)
├── styles/                   # global.css (Tailwind v4 CSS-first)
├── types/                    # Ambient .d.ts (carbone, odoo)
├── constants.ts              # SITE_TITLE, API_URL, REMOTE_ASSETS_BASE_URL
├── middleware.ts             # Auth + RBAC + CSP (ver §Authentication)
└── env.d.ts                  # Astro env types
```

### Logging (`@infrastructure/logging`)

Logger basado en **Winston**, **solo servidor** (depende de APIs de Node — NO importar desde `.client.ts`, islands `.tsx` ni scripts inline `.astro`; ahí usar `console.*`).

```ts
import { createLogger } from '@infrastructure/logging';
const log = createLogger('webhook'); // el `context` reemplaza prefijos `[tag]`

log.info('pago registrado', { paymentId }); // metadata estructurada, NO interpolar
log.error('handler error', { err });         // captura stack automáticamente
```

- En prod emite **JSON estructurado a stdout** (lo recoge Docker); en dev, formato coloreado legible.
- Nivel por `LOG_LEVEL` (default `info` en prod / `debug` en dev).
- Pasar datos como metadata `{ key: value }`, nunca interpolados en el string.
- Todo el logging de servidor (`infrastructure/`, `domains/`, API routes `.ts`, servicios SSR) usa `createLogger`. Los `console.*` que quedan son **solo cliente** (`.client.ts`, islands `.tsx`, scripts inline `.astro`) y deben permanecer así.

### Naming Conventions

**Convención uniforme aplicada en todo el codebase:**

| Tipo de archivo | Convención | Ejemplo |
|---|---|---|
| Componentes `.astro` | **PascalCase** | `Dashboard.astro`, `BasicForm.astro` |
| Componentes `.tsx` (incluido shadcn UI) | **PascalCase** | `Button.tsx`, `DropdownMenu.tsx` |
| Archivos `.ts`/`.client.ts` (no-componentes) | **kebab-case** | `get-companies-page-data.ts`, `dashboard-partners.client.ts` |
| Folders | **kebab-case** | `dashboard-companies/`, `forms/` |
| Config files at root | (lowercase) | `astro.config.mjs`, `tsconfig.json` |

### API Routes (`src/pages/api/`)

Organizadas **por dominio** (no por verbo HTTP):

```
api/
├── auth/             # sign-in, sign-out, register, register-start, forgot-password,
│   └── oauth/        #   reset-password, save-data, session-check, token
│                     # oauth/: callback, callback-popup, callback-start, google,
│                     #         google-one-tap, invite-callback, popup-url, url, start-with-google
├── users/            # create-admin, invite, update, update-avatar, update-profile
├── roles/create
├── companies/        # create, set-active, update-avatar, update-profile
├── services/         # create, update, restore, soft-delete
├── forms/            # create, update, submit, +incorporation variants
├── billing/          # upsert-invoice, update-invoice
├── notifications/    # admin-update, update
├── partners/         # contract, redeem-code, upload-contract
├── operations/mark-payment-read
├── incorporations/   # save, validate, get-status
├── documents/        # events, list, request, review, revoke-share, share, signed-url, upload, upload-signed
├── payment/          # checkout-session, checkout-session-upgrade, payment-intent, payment-intent-upgrade, register, webhook
├── pdf/generate
├── health/           # index (liveness público), deep (readiness con Bearer HEALTH_CHECK_TOKEN)
├── charts/           # odoo-partners, partners-count, mapa-empresas.client
├── odoo/             # referrals, test-odoo
├── onboarding/complete
├── storage/get-signed-url
└── workflow/         # bootstrap, incorporation/[id], stages/approval, tasks/complete
```

### Authentication & Middleware

- `src/middleware.ts` — Valida sesión via `supabase.auth.getClaims()` (verificación local del JWT, más rápido que `getUser()`). Construye un objeto `User`-compatible desde los JWT claims y popula `context.locals.user`, `context.locals.userRoles` y `context.locals.supabase` en cada request. **IMPORTANTE**: No ejecutar código entre `createServerClient` y `getClaims()` — puede causar logouts aleatorios.
- También aplica **CSP y headers de seguridad** a respuestas HTML (no a API/JSON ni redirects).
- Control de acceso por rol basado en la ruta:
  - `/admin/`, `/users/`, `/forms/`, `/crud/` → solo `admin`
  - `/admin/incorporations`, `/admin/companies`, `/admin/usuarios` → `admin`, `operaciones`
  - `/incorporation/`, `/company/` → `cliente`, `partner` (vistas cliente)
  - `/partners/` → solo `partner`
  - `/services/`, `/profile/`, `/pages/` → multi-rol
  - Legacy (páginas redirect 301): `/my-companies/*` → `/incorporation|/company`, `/incorporations/*` → `/admin/incorporations`, `/companies/[id]` → `/admin/companies/[id]`, `/admin/incorporaciones|empresas` → `/admin/incorporations|companies`
  - Rutas públicas: `/api`, `/_image`, `/start`, `/incorporation-and-payment`, `/test`, `/assets`, `/payment/success`, `/payment/cancel`
  - Rutas auth (redirect a home si ya autenticado): `/sign-in`, `/sign-up`, `/forgot-password`
- Los roles se obtienen de la tabla `user_roles` con FK a `roles`. Cache in-memory de 5 min para evitar query por request.

### Auth Service (`src/lib/infrastructure/auth/`)

`AuthService` es una clase per-request que recibe `SupabaseClient`. Métodos principales: `signInWithPassword`, `register`, `signInWithOAuth`, `exchangeCodeForSession` (con PKCE retry), `signOut`, `forgotPassword`, `resetPassword`, `handleInviteCallback`.

Helpers importantes en `auth.helpers.ts`:
- `redirectWithMessage`, `buildMessageUrl` — redirecciones con mensajes
- `jsonResponse`, `jsonError`, `jsonSuccess` — respuestas JSON consistentes
- `friendlyAuthError` — mapea errores de Supabase a mensajes en español

Los API routes de auth son thin handlers:

```ts
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService } from '@infrastructure/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
  const auth = new AuthService(supabase, cookies);
  // parse formData, call auth method, catch AuthError, redirect with message
};
```

### Supabase Client Usage

**Preferir `createSupabaseServerClient`** para SSR (una instancia por request con cookies):

```ts
import { createSupabaseServerClient } from '@infrastructure/supabase';

// En componente Astro:
const supabase = createSupabaseServerClient(Astro);

// En API route:
const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
```

`supabaseAdmin` (service role) para operaciones privilegiadas. `supabaseBrowser` para client-side.

> **Nota**: Desde el middleware, `Astro.locals.supabase` ya tiene la instancia per-request — preferirla para evitar `ResponseSentError` por crear múltiples clientes.

### Domains Pattern (`src/domains/`)

Funciones typed de acceso a datos. Siempre reciben `SupabaseClient` como primer argumento:

```ts
// src/domains/companies/incorporations.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export const getIncorporacionById = async (supabase: SupabaseClient, empresaId: string) => {
  const { data, error } = await supabase
    .from('empresas_incorporaciones')
    .select(`*, usuarios:user_id (nombre, apellido, correo)`)
    .eq('empresa_incorporacion_id', empresaId)
    .single();
  if (error || !data) return null;
  return data;
};
```

> **Importante**: Los nombres de tabla y columnas en Supabase (`usuarios`, `empresas_incorporaciones`, etc.) y los nombres de funciones JS (`getUsuarioById`, etc.) están en español por compatibilidad con la DB. Solo los **filepaths** y **estructura** están en inglés. No renombrar funciones ni tablas.

### Module Canonical Structure

Todos los módulos siguen el mismo molde uniforme:

```
src/modules/<feature>/
├── <Page>.astro              # Entrypoint(s) consumido(s) por src/pages
├── <name>.client.ts          # JS de browser (opcional)
├── components/               # .astro hijos del módulo
├── islands/                  # .tsx hidratados con client:load
├── services/                 # get-xxx-page-data.ts — agregadores SSR
└── types.ts                  # Tipos del módulo
```

Servicios de página agregan datos de múltiples queries de `domains/`:

```ts
// src/modules/companies/services/get-companies-page-data.ts
export async function getCompaniesPageData(supabase: SupabaseClient, userId: string) {
  const [companies, states] = await Promise.all([
    getEmpresasByUserId(supabase, userId),
    getEstados(supabase),
  ]);
  return { companies, states };
}
```

### Roles

Definidos en `src/lib/shared/roles.ts`: `admin`, `partner`, `cliente`, `operaciones`. Usar los helpers `isAdmin()`, `isPartner()`, `isClient()`, `isOperaciones()` para verificar.

### Tailwind CSS v4

No existe `tailwind.config.js`. Toda la config está en `src/styles/global.css` via CSS-first syntax:
- `@import "tailwindcss"` (sin Flowbite — removido; ver §UI Behaviors)
- `@plugin "@tailwindcss/forms"`, `@plugin "tailwind-scrollbar"`
- `@theme {}` define colores custom (primary, black, white) y fonts (Inter)
- Dark mode usa class strategy: `@variant dark (&:where(.dark, .dark *))`. El `<html>` tiene `class="dark"` por defecto.

### Astro Islands

Los archivos `.tsx` en `modules/<feature>/islands/` se hidratan con `client:load` desde el componente `.astro` parent:

```astro
---
import CompaniesCrudTable from './islands/CompaniesCrudTable.tsx';
---
<CompaniesCrudTable data={data} client:load />
```

Para los `<script>` con atributos (`define:vars`, `type="module"`, `src=`, etc.) usar `is:inline` explícito (Astro 6 lo trata implícitamente como inline pero el linter pide hacerlo explícito).

### Key Dependencies

- **Stripe** — pagos (`api/payment/`)
- **Puppeteer + @sparticuz/chromium** — generación de PDFs (`api/pdf/`)
- **Carbone / Docxtemplater / Mammoth** — generación y parsing de documentos Word. Carbone lee plantillas de `src/domains/documents/templates/`.
- **ApexCharts** — charts en los `.client.ts` de dashboard
- **SurveyJS (survey-core)** — formularios dinámicos
- **Dropzone** — file uploads
- **simple-datatables** — tablas con sorting/paging
- **intl-tel-input** — input de teléfono internacional

### Environment Variables

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — admin client
- `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASSWORD`, `BREVO_SMTP_FROM_EMAIL`, `BREVO_SMTP_FROM_NAME` — SMTP de Brevo (recomendado)
- `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME` — compatibilidad
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` — compatibilidad legada
- `SUPABASE_OAUTH_REDIRECT_TO` — (opcional) OAuth redirect en producción
- `PUBLIC_GOOGLE_CLIENT_ID` — Google One Tap
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` — Stripe
- `RENDER_SERVER_URL` — microservicio Carbone
- `HEALTH_CHECK_TOKEN` — token Bearer para `/api/health/deep` (readiness para Uptime Kuma). Sin configurar, el endpoint responde 401.
- `LOG_LEVEL` — (opcional) nivel del logger Winston (`error|warn|info|http|verbose|debug|silly`). Default `info` en prod, `debug` en dev.

## Conventions

- **UI de listados/CRUD**: seguir `docs/ui-conventions.md` (tabla TanStack con filtro global + Sheet de detalle compartido + cards KPI; tokens permitidos y clases prohibidas). Referencia: vistas de órdenes.
- **Idioma del código y estructura**: 100% inglés a nivel de filepaths, folders, imports, URLs internas y nombres de variables nuevas.
- **Idioma de UI/UX**: Mensajes al usuario, comentarios, errores friendly y rutas públicas pueden estar en español (es la cara al cliente).
- **Excepción intencional**: nombres de tablas y columnas en Supabase, y nombres de funciones JS legacy (e.g., `getUsuarioById`, `empresas_incorporaciones`) permanecen en español por compatibilidad con la DB.
- **TypeScript estricto**: `tsconfig` extiende `astro/tsconfigs/strictest`.
- **Formato**: `useTabs: true`, `tabWidth: 2`, single quotes, trailing commas, printWidth 80. Config en `prettier.config.mjs`. Plugins: `prettier-plugin-astro` y `prettier-plugin-tailwindcss` (debe ir al final).
- **Iconos**: `astro-icon` con el set `@iconify-json/ri` (Remix Icons). SVGs locales en `src/icons/` (default de astro-icon).
- **HTTP methods**: Uppercase (`GET`, `POST`, `PUT`, `DELETE`) per Astro convention.
- **Deployment**: Docker multi-stage (node:22-alpine). Usa `npm ci` (no pnpm) en Docker — `package-lock.json` está committed para reproducibilidad. El entrypoint de producción es `server.mjs` que carga `dist/server/entry.mjs`.
- **`.npmrc`**: tiene `node-linker=hoisted` (requerido para que pnpm coexista con paquetes que esperan `node_modules` plano).

## SQL & Database

Scripts SQL de Supabase (RLS, schemas, sharing) en `supabase/sql/`:
- `documents_tables.sql` — schemas de las tablas de documentos
- `documents_rls.sql` — Row Level Security policies
- `documents_sharing.sql` — schemas y policies de sharing

### Schemas expuestos en PostgREST

Exposed Schemas (Supabase → Settings → API): `public, graphql_public, documents, workflow, shared, catalogs, meetings, orders`. Un schema nuevo debe agregarse ahí o las queries dan `PGRST106`. Acceso desde código: `supabase.schema('<schema>').from('<tabla>')`.

> **⚠️ Gotcha PostgREST — embeds cross-schema**: los embeds (`select=...,rel:fk(...)`) **no se resuelven cuando el profile de la request es un schema no-`public`** (p.ej. `orders`), aunque exista el FK. Regla: dentro de `orders.*` usar solo embeds **intra-schema**; para datos de `public`/`catalogs` **denormalizar** (ver `order_lines.service_plan_name`/`service_name`) o hacer **lookup + join en JS** (ver `fetchLookups` en `domains/payments/unread.ts`).

### Órdenes y pagos (schema `orders`)

Modelo canónico: `orders.orders` (una por checkout; `pending_payment` → `confirmed`) → `orders.order_lines` (plan + addons; nombres denormalizados) → `orders.payments` (1 orden → N pagos, `amount` en **dólares**, upsert por `provider_transaction_id`) → `orders.payment_events` (auditoría inmutable de eventos Stripe, idempotente por `provider_event_id`). Reemplazó a la tabla plana `public.pagos` (eliminada). Flujo: `checkout-session(.ts)` crea la orden y pasa `order_id` en metadata Stripe → `webhook` llama RPC `registrar_pago_desde_stripe` (confirma orden + upserta pago) e inserta el `payment_event`. El **fulfillment se dispara desde `plan_id`**: triggers en `orders.payments` (`orders.trg_payment_succeeded_workflow`, `orders.trg_payment_set_incorporation_state`) rederivan `incorporation_id` (de la orden) y `plan_id` (de la order_line base) y llaman `workflow.create_workflow_for_incorporation`. RLS: cliente ve lo suyo (`user_id = auth.uid()`); admin/operaciones vía `orders.is_staff()`. "Marcar como leído" = `mark_pago_visto_secure(order_id)` → `orders.orders.seen_by_ops`.

Para listados admin se usa la **vista `orders.order_admin_details`** (`security_invoker`, una fila por orden con cliente/empresa/plan/pago + `lines` jsonb del desglose): resuelve los joins cross-schema en SQL (evita el gotcha de embeds) y respeta `catalogs.service_plans.show_prices` (si es `false`, `total` y `unit_price` de las líneas salen nulos). La consume `domains/payments/orders.ts` (`getOrdersForAdmin`) → tab "Órdenes" (`modules/billing/islands/OrdersTable.tsx`, detalle en `Sheet` con lista de servicios).

# Project Instructions

## Use Context7 by Default

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.
