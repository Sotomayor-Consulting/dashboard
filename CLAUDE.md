# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dashboard SSR para **Sotomayor Consulting** — gestión de LLCs, partners, facturación e incorporaciones. Construido con Astro 5 en modo SSR (`output: 'server'`) con adapter Node.js standalone, Supabase como backend (auth + DB), Tailwind CSS v4 y Flowbite como UI kit.

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
import LayoutSidebar from '@app/layouts/LayoutSidebar.astro';
import DashBoard from '@modules/dashboard/DashBoard.astro';
---
<LayoutSidebar>
  <DashBoard />
</LayoutSidebar>
```

### Path Aliases (tsconfig.json)

- `@components/*` → `src/components/*`
- `@modules/*` → `src/modules/*`
- `@lib/*` → `src/lib/*`
- `@lib/auth` → `src/lib/auth/index.ts`
- `@lib/supabase` → `src/lib/supabase/index.ts`
- `@app/*` → `src/app/*`
- `@services/*` → `src/services/*`

### Key Directories

- **`src/app/layouts/`** — Layouts maestros. `LayoutCommon` es el HTML shell base (head, dark mode, flowbite). `LayoutSidebar` y `LayoutStacked` extienden `LayoutCommon` con navegación.
- **`src/app/navigation/`** — Componentes de navegación (NavBar, SideBar). La sidebar se configura desde `src/lib/interface/itemsNavegacion.ts` donde cada item tiene un array `roles` (`'all'` = universal, o roles específicos).
- **`src/app/constants.js`** — `SITE_TITLE`, `API_URL`, `REMOTE_ASSETS_BASE_URL`.
- **`src/pages/`** — Rutas Astro. Las pages importan un layout + un módulo y los componen.
- **`src/modules/`** — Features completas por dominio (auth, dashboard, crud, billing, forms, partners, companies, landing, errors, shared). Cada módulo tiene sus propios `.astro` components y opcionalmente `.client.ts` para JS del browser.
- **`src/components/`** — Componentes reutilizables atómicos (forms/, feedback/, display/, navigation/, ui/).
- **`src/lib/`** — Lógica de negocio e infraestructura:
  - `auth/` — AuthService, config, helpers, types (barrel export en index.ts)
  - `supabase/` — Tres clientes: `createSupabaseServerClient` (SSR, preferido), `supabaseAdmin` (service role), `supabaseBrowser` (client-side). El singleton `supabase` en `client.ts` está `@deprecated`.
  - `tables/` — ~21 módulos de acceso a datos por tabla. Cada archivo exporta funciones typed que reciben `SupabaseClient` + identificadores y retornan data tipada o `null`.
  - `roles.ts` — Constantes y helpers de roles (`admin`, `partner`, `cliente`, `operaciones`)
  - `security/headers.ts` — `SECURITY_HEADERS` para API routes que retornan JSON.
  - `interface/` — Definiciones de items de navegación (`itemsNavegacion.ts`) y headers de tablas.
  - `odoo/` — Integración con Odoo via XML-RPC
  - `mailing/` — Nodemailer
  - `carbone.ts` — Generación de documentos con Carbone
  - `data.ts` — `fetchData()` helper para llamadas internas al API, `url()` y `asset()` path helpers
  - `datatables/` — Archivos vendored (DataTables JS/CSS, Alpine.js bundle)
- **`src/services/`** — Capa de servicios (actualmente mínima: products, users, partners). La mayoría de la lógica de negocio está directamente en los API routes específicos.
- **`src/pages/api/`** — API routes organizadas por dominio: `auth/`, `create/`, `update/`, `generales/`, `payment/`, `pdf/`, `facturacion/`, `incorp/`, `forms/`, `operaciones/`, `documentos/`, `charts/`. El catch-all `[...entity].ts` solo mapea `products` y `users` como scaffold.
- **`src/styles/`** — `global.css` (Tailwind v4 CSS-first config), más overrides para DataTables, Dropzone y SurveyJS.

### Authentication & Middleware

- `src/middleware.ts` — Valida sesión via `supabase.auth.getClaims()` (verificación local del JWT, más rápido que `getUser()`). Construye un objeto `User`-compatible desde los JWT claims y popula `context.locals.user` y `context.locals.userRoles` en cada request. **IMPORTANTE**: No ejecutar código entre `createServerClient` y `getClaims()` — puede causar logouts aleatorios.
- Control de acceso por rol basado en la ruta:
  - `/crud/`, `/admin/` → solo `admin`
  - `/partners/`, `/afiliados/` → solo `partner`
  - `/pages/` → `partner` y `cliente`
  - `/profile/` → `admin`, `partner`, `cliente`
  - Rutas públicas: `/api`, `/start`, `/incorporacion-y-pago`, `/test`, `/playground`
  - Rutas auth (redirect a home si ya autenticado): `/sign-in`, `/sign-up`, `/forgot-password`
- Los roles se obtienen de la tabla `user_roles` con FK a `roles`.

### Auth Service (`src/lib/auth/`)

`AuthService` es una clase per-request que recibe `SupabaseClient`. Métodos principales: `signInWithPassword`, `register`, `signInWithOAuth`, `exchangeCodeForSession` (con PKCE retry), `signOut`, `forgotPassword`, `resetPassword`, `handleInviteCallback`.

Helpers importantes en `auth.helpers.ts`:
- `redirectWithMessage`, `buildMessageUrl` — redirecciones con mensajes
- `jsonResponse`, `jsonError`, `jsonSuccess` — respuestas JSON consistentes
- `friendlyAuthError` — mapea errores de Supabase a mensajes en español

Los API routes de auth son thin handlers:
```ts
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
  const auth = new AuthService(supabase, cookies);
  // parse formData, call auth method, catch AuthError, redirect with message
};
```

### Supabase Client Usage

**Preferir `createSupabaseServerClient`** para SSR (una instancia por request con cookies).

```ts
// En componente Astro:
const supabase = createSupabaseServerClient(Astro);

// En API route:
const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
```

`supabaseAdmin` (service role) para operaciones privilegiadas. `supabaseBrowser` para client-side.

### Tables Pattern (`src/lib/tables/`)

Funciones typed de acceso a datos. Siempre reciben `SupabaseClient` como primer argumento:

```ts
export const getEmpresaById = async (supabase: SupabaseClient, empresaId: string) => {
  const { data, error } = await supabase
    .from('empresas_incorporaciones')
    .select(`*, usuarios:user_id (nombre, apellido, correo)`)
    .eq('empresa_incorporacion_id', empresaId)
    .single();
  if (error || !data) return null;
  return data;
};
```

### Roles

Definidos en `src/lib/roles.ts`: `admin`, `partner`, `cliente`, `operaciones`. Usar los helpers `isAdmin()`, `isPartner()`, `isClient()`, `isOperaciones()` para verificar.

### Tailwind CSS v4

No existe `tailwind.config.js`. Toda la config está en `src/styles/global.css` via CSS-first syntax:
- `@import "tailwindcss"` + `@import "flowbite/src/themes/default"`
- `@plugin "flowbite/plugin"`, `@plugin "flowbite-typography"`, `@plugin "tailwind-scrollbar"`
- `@theme {}` define colores custom (primary, black, white) y fonts (Inter)
- Dark mode usa class strategy: `@variant dark (&:where(.dark, .dark *))`. El `<html>` tiene `class="dark"` por defecto.

### Key Dependencies

- **Stripe** — pagos (`api/payment/`)
- **Puppeteer + @sparticuz/chromium** — generación de PDFs (`api/pdf/`)
- **Carbone / Docxtemplater / Mammoth** — generación y parsing de documentos Word
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

## Conventions

- **Idioma**: El código, comentarios y mensajes de usuario están mayoritariamente en español.
- **TypeScript estricto**: `tsconfig` extiende `astro/tsconfigs/strictest`.
- **Formato**: `useTabs: true`, `tabWidth: 2`, single quotes, trailing commas, printWidth 80. Config en `prettier.config.mjs`. Plugins: `prettier-plugin-astro` y `prettier-plugin-tailwindcss` (debe ir al final).
- **Iconos**: `astro-icon` con el set `@iconify-json/ri` (Remix Icons).
- **HTTP methods**: Uppercase (`GET`, `POST`, `PUT`, `DELETE`) per Astro 5 convention.
- **Deployment**: Docker multi-stage (node:22-alpine). Usa `npm ci` (no pnpm) en Docker — `package-lock.json` está committed para reproducibilidad. El entrypoint de producción es `server.mjs` que carga `dist/server/entry.mjs`.

# Project Instructions
## Use Context7 by Default
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.
