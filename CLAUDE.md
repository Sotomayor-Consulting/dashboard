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
npx prettier --write . # Formatear código
```

No hay test runner configurado actualmente.

## Architecture

### SSR & Rendering

Todo es server-rendered por defecto (`output: 'server'` en `astro.config.mjs`). Los archivos `.client.ts` en modules contienen código que se ejecuta en el browser. Alpine.js se usa para interactividad ligera en el cliente.

### Path Aliases (tsconfig.json)

- `@components/*` → `src/components/*`
- `@modules/*` → `src/modules/*`
- `@lib/*` → `src/lib/*`
- `@lib/auth` → `src/lib/auth/index.ts`
- `@lib/supabase` → `src/lib/supabase/index.ts`
- `@app/*` → `src/app/*`
- `@services/*` → `src/services/*`
- `@types/*` → `src/types/*`

### Key Directories

- **`src/app/layouts/`** — Layouts maestros: `LayoutSidebar`, `LayoutStacked`, `LayoutCommon`, etc.
- **`src/pages/`** — Rutas Astro. Las pages importan un layout + un módulo y los componen.
- **`src/modules/`** — Features completas por dominio (auth, dashboard, crud, billing, forms, partners, companies, landing). Cada módulo tiene sus propios `.astro` components y opcionalmente `.client.ts` para JS del browser.
- **`src/components/`** — Componentes reutilizables atómicos (forms/, feedback/, display/, navigation/, ui/).
- **`src/lib/`** — Lógica de negocio e infraestructura:
  - `auth/` — AuthService, config, helpers, types (barrel export en index.ts)
  - `supabase/` — Tres clientes: `createSupabaseServerClient` (SSR, preferido), `supabaseAdmin` (service role), `supabaseBrowser` (client-side)
  - `tablas/` — Módulos de acceso a datos por tabla de Supabase
  - `roles.ts` — Constantes y helpers de roles (`admin`, `partner`, `cliente`, `operaciones`)
  - `odoo/` — Integración con Odoo via XML-RPC
  - `mailing/` — Nodemailer
- **`src/services/`** — Operaciones de negocio llamables internamente o via el API REST genérico.
- **`src/pages/api/`** — API routes. El catch-all `[...entity].ts` mapea endpoints REST a operaciones de `src/services/`. Rutas específicas bajo `api/auth/`, `api/create/`, `api/update/`, etc.

### Authentication & Middleware

- `src/middleware.ts` — Valida sesión via cookies de Supabase en cada request. Aplica control de acceso por rol basado en la ruta:
  - `/crud/`, `/admin/` → solo `admin`
  - `/partners/` → solo `partner`
  - `/pages/` → solo `client`
  - Rutas públicas: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/api/`
- Los roles se obtienen de la tabla `user_roles` con FK a `roles`.
- `AuthService` (`src/lib/auth/auth.service.ts`) encapsula toda la lógica de auth. Los API routes son thin handlers que delegan al servicio.

### Supabase Client Usage

**Preferir `createSupabaseServerClient`** para SSR (una instancia por request con cookies). El singleton `supabase` está deprecated.

```ts
// En componente Astro:
const supabase = createSupabaseServerClient(Astro);

// En API route:
const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
```

### Roles

Definidos en `src/lib/roles.ts`: `admin`, `partner`, `cliente`, `operaciones`. Usar los helpers `isAdmin()`, `isPartner()`, `isClient()`, `isOperaciones()` para verificar.

## Conventions

- **Idioma**: El código, comentarios y mensajes de usuario están mayoritariamente en español.
- **TypeScript estricto**: `tsconfig` extiende `astro/tsconfigs/strictest`.
- **Formato**: Tabs, single quotes, trailing commas, printWidth 80. Prettier con plugins `prettier-plugin-astro` y `prettier-plugin-tailwindcss` (debe ir al final).
- **Estilos**: Tailwind CSS v4 via plugin Vite (`@tailwindcss/vite`). Estilos globales en `src/styles/`.
- **Iconos**: `astro-icon` con el set `@iconify-json/ri` (Remix Icons).
- **Deployment**: Docker multi-stage (node:22-alpine). El entrypoint de producción es `server.mjs` que carga `dist/server/entry.mjs`.

# Project Instructions
## Use Context7 by Default
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.