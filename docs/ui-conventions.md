# Convenciones de UI — vistas de datos (tablas, cards, detalle)

Estándar de diseño para implementar nuevas vistas de listados/CRUD en el
dashboard. Referencia viva: las **vistas de órdenes** (`modules/billing` tab
"Órdenes" para admin, `modules/documents/Orders.astro` para cliente).

## Estructura general de una vista de listado

Toda feature de listado sigue el molde de módulo (`src/modules/<feature>/`):

1. **Page `.astro` thin** (`src/pages/...`) — solo importa layout + módulo.
2. **Entrypoint del módulo** (`<Page>.astro`) — obtiene datos vía funciones de
   `@domains/*` usando `Astro.locals.supabase` y los pasa a las islands.
3. **Islands `.tsx`** (`islands/`) — tabla interactiva, cards de resumen,
   dropdowns, sheets. Se hidratan con `client:load` (o `client:visible` si
   están below-the-fold).
4. **Lo compartido entre módulos** va en `src/components/` — p. ej.
   `@components/display/orders/` (Sheet de detalle + helpers de formato de
   órdenes, usados por la vista admin y la vista cliente).

```
src/components/display/orders/
├── OrderDetailsSheet.tsx   # Sheet de detalle reutilizable (admin + cliente)
└── order-format.ts         # ORDER_STATUS_LABEL, orderStatusVariant, formatUsd, formatDate
```

**Regla**: labels de estado, variantes de badge y formateadores de un dominio
se definen **una sola vez** en un archivo compartido. Nunca duplicarlos entre
islands.

## Tabla admin estándar (TanStack + primitives de `@components/ui`)

Modelo a seguir: `modules/billing/islands/OrdersTable.tsx`.

- **Librería**: `@tanstack/react-table` + `Table/TableHeader/TableBody/...` de
  `@components/ui/Table`.
- **Columnas**: TODAS las columnas (incluida "Acciones") se definen en el
  array `columns: ColumnDef<T>[]`. No inyectar `<TableHead>`/`<TableCell>`
  extra a mano fuera de las columnas. Si una columna necesita callbacks del
  componente, definir `columns` dentro del componente con `React.useMemo`.
- **Búsqueda**: input único con icono de lupa a la izquierda:

  ```tsx
  <div className="relative w-full max-w-sm">
  	<SearchIcon
  		size={16}
  		className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
  	/>
  	<Input placeholder="Buscar por ..." className="max-w-sm pl-9" ... />
  </div>
  ```

  Para buscar sobre varios campos usar **`globalFilter` + `globalFilterFn`**
  custom (OR sobre los campos buscables). ⚠️ NO setear el mismo valor con
  `setFilterValue` en varias columnas: TanStack combina los column filters con
  **AND** y el resultado queda vacío.

- **Wrapper de la tabla**:
  `<div className="overflow-hidden rounded-md border bg-white dark:bg-neutral-900">`.
- **Empty state**: fila única `colSpan={columns.length}` con
  `className="h-16 text-center"` y mensaje en español.
- **Paginación**: dos `Button variant="outline" size="sm"` ("Anterior" /
  "Siguiente") alineados a la derecha (`flex items-center justify-end gap-2`).
- **Acciones por fila**: `DropdownMenu` con trigger
  `Button variant="ghost" size="icon-sm"` + `MoreHorizontalIcon` de
  `lucide-react` (en islands se usa lucide; `astro-icon`/Remix solo en
  `.astro`). Incluir `aria-label` y `<span className="sr-only">`.

## Detalle de un registro: Sheet lateral

El detalle se abre en un `Sheet` (`side="right"`, `className="w-full sm:max-w-md"`)
con `SheetHeader/SheetTitle/SheetDescription`. Ver
`@components/display/orders/OrderDetailsSheet.tsx`:

- Grid de 2 columnas de pares label/valor (`DetailRow`: label en
  `text-muted-foreground text-xs`, valor en `font-medium`, fallback `—`).
- Listas de desglose en `<ul className="divide-border divide-y rounded-md border">`.
- Montos con `tabular-nums`; IDs técnicos (Stripe, UUIDs) con
  `font-mono text-xs break-all`.
- El mismo Sheet se comparte entre la vista admin (tabla) y la vista cliente
  (dropdown de la card) — controlado por props `{ order, open, onOpenChange }`.

## Cards de resumen (KPIs sobre la tabla)

Modelo: `modules/billing/islands/CardsHeadOrders.tsx`. Grid
`grid-cols-1 gap-4 md:grid-cols-3`, cada card con `Card/CardHeader`:
`CardDescription` como label, `CardTitle` con
`text-2xl font-semibold tabular-nums`, icono lucide en `CardAction` con
`text-primary-gold`.

## Estados y badges

- En tablas usar `Badge` de `@components/ui/Badge`. Variantes disponibles:
  `susess` (sic, verde — así está escrito en el codebase, no "corregirlo" solo
  en un lugar), `warning`, `danger`, `destructive`, `standar`, `alternative`,
  `outline`, `secondary`, `default`.
- Mapear estado→variante con una función compartida (p. ej.
  `orderStatusVariant`): confirmado → `susess`, cancelado → `destructive`,
  resto → `warning`.
- En cards `.astro` (vista cliente) el pill de estado usa tokens, nunca hex
  arbitrarios: positivo → `border-success text-success bg-success/15`,
  pendiente → `border-amber-500 bg-amber-500/10 text-amber-600`.

## Clases y tokens permitidos

Solo usar clases que existan en Tailwind o estén definidas en
`src/styles/global.css`:

- **Tokens semánticos**: `text-foreground`, `text-muted-foreground`,
  `border-border`, `bg-background`, `text-primary`, `text-primary-gold`,
  `text-success` / `bg-success` / `border-success`, `text-destructive`.
- **Utilidades de layout flat** (definidas en `global.css` `@layer components`):
  `.flat-card`, `.flat-card-padded`, `.flat-list`, `.section-title`,
  `.section-description`, `.kicker`, `.stat-value`, `.stat-label`.
- ⚠️ **NO usar clases estilo Material** (`text-title-lg`, `text-on-surface`,
  `font-display-md`, `text-label-lg`, `text-on-surface-variant`, ...): **no
  existen** en este proyecto, Tailwind no las genera y el elemento queda sin
  estilo silenciosamente. Equivalencias:

  | Clase muerta                      | Usar en su lugar                          |
  | --------------------------------- | ----------------------------------------- |
  | `text-title-lg text-on-surface`   | `text-base font-semibold text-foreground` |
  | `text-title-md text-on-surface`   | `text-sm font-medium text-foreground`     |
  | `text-on-surface-variant`         | `text-muted-foreground`                   |
  | `text-display-md`                 | `text-2xl font-bold`                      |
  | `text-label-sm` / `text-label-lg` | `text-xs` / `text-sm font-semibold`       |

## Formato de datos

Helpers compartidos (para órdenes: `@components/display/orders/order-format.ts`;
replicar el patrón por dominio):

- **Moneda**: `toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })`.
- **Fechas**: `toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' })`.
- **Fallback**: `—` (em dash) para valores nulos, nunca "null" ni vacío.

## Idioma y microcopy

- UI siempre en español **con tildes** ("Órdenes", "más vendido", "menú").
- Labels de estado centralizados en un `Record<string, string>` compartido
  (`ORDER_STATUS_LABEL`) para que admin y cliente muestren el mismo texto.
- `Tabs`: el `value` es un slug descriptivo en kebab-case
  (`"pagos-realizados"`, `"ordenes"`), nunca placeholders (`"test"`).
