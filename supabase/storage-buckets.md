# Estructura de Supabase Storage — Definición canónica

> Fuente de verdad de la organización de buckets y convenciones de ruta.
> Decisiones acordadas: **2 buckets de documentos** (intake + gestionado) ·
> **escritura de intake vía API con service-role** · **segmentos de path en inglés**.

## Modelo de dos capas

Los archivos siguen la misma simetría que el `payload` jsonb del formulario:
una capa **intake** (cruda, volátil, durante la incorporación) y una capa
**gestionada** (curada, sistema de registro, empresa ya constituida).

```
CAPA INTAKE                          CAPA GESTIONADA
documentos_empresas      ──promo──▶  documents
(pre-validación)                     (post-incorporación, con metadata + sharing)
```

Al **promover** una incorporación, los archivos validados se copian del bucket
intake al gestionado y se registran en la tabla de metadata. Igual que
`incorporation_forms.payload → companies/members/company_members`.

## Inventario de buckets

| Bucket | Privacidad | Límite | Propósito | Convención de ruta |
|---|---|---|---|---|
| `documentos_empresas` | privado | 10 MB · pdf/jpg/png/webp | **Intake** de incorporación | `{userId}/incorporations/{incorporationId}/…` |
| `documents` | privado | 2 MB | **Gestionado**: deliverables, contratos, EIN, informes, por-firmar | `{userId}/companies/{companyId}/documents/{uuid}-{name}` |
| `avatars` | público | 5 MB · imágenes | Avatar de usuario | `{userId}/avatar.{ext}` |
| `empresa-logos` | público | 10 MB · imágenes | Logo de empresa | `{companyId}/logo.{ext}` |
| `templates` | privado | 20 MB · pdf/docx | Plantillas Carbone | `templates/…` |

Buckets a **eliminar**: `test` (basura), `documentos_usuarios` (muerto, 0 filas).

## Convención de ruta — `documentos_empresas` (intake)

Primer segmento = `{userId}` **obligatorio** (pivote de RLS: la política de
lectura exige `(storage.foldername(name))[1] = auth.uid()`). IDs opacos siempre,
nunca nombres humanos. Nombres de archivo deterministas (un documento por slot →
re-subir sobrescribe limpio).

```
{userId}/
└── incorporations/{incorporationId}/
    ├── company/utility-bill.{ext}
    ├── members/{memberId}/passport.{ext}
    ├── members/{memberId}/utility-bill.{ext}
    ├── managers/{managerId}/passport.{ext}
    ├── managers/{managerId}/utility-bill.{ext}
    └── signature.png
```

Mapa slot (API `/api/incorporations/[incorporationId]/files`) → ruta:

| Slot | Ruta (relativa a `{userId}/incorporations/{incId}/`) |
|---|---|
| `company-utility` | `company/utility-bill.{ext}` |
| `member-passport` (+ `entityId`) | `members/{memberId}/passport.{ext}` |
| `member-utility` (+ `entityId`) | `members/{memberId}/utility-bill.{ext}` |
| `manager-passport` (+ `entityId`) | `managers/{managerId}/passport.{ext}` |
| `manager-utility` (+ `entityId`) | `managers/{managerId}/utility-bill.{ext}` |
| `signature` (subido en el submit) | `signature.png` |

## Convención de ruta — `documents` (gestionado)

```
{userId}/companies/{companyId}/documents/{uuid}-{originalName}.{ext}
```

El subconjunto pendiente de firma se rastrea en la tabla
`public.documentos_por_firmar` (`storage_path` apunta a este mismo bucket).

## Modelo de seguridad (RLS sobre `storage.objects`)

| Bucket | INSERT / UPDATE / DELETE | SELECT |
|---|---|---|
| `documentos_empresas` | solo `admin` (la API escribe con **service-role** tras verificar ownership) | `admin` o dueño de `{userId}/…` |
| `documents` | service-role (server-mediated) | **signed URLs** server-side |
| `avatars` | dueño de `{userId}/…` | público |
| `empresa-logos` | dueño (objetivo: restringir; hoy INSERT abierto a cualquier auth) | público |
| `templates` | `admin` | cualquier autenticado |

## Hardening pendiente (cambios a aplicar)

1. `documentos_empresas`: setear `file_size_limit = 10MB` y `allowed_mime_types`
   (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
2. `documents`: eliminar la política RLS `Give users authenticated access to
   folder flreew_*` — keyea en `private/` que **no coincide** con los paths
   reales (`{userId}/…`); el acceso real es por signed URL. Política muerta.
3. `empresa-logos`: cambiar `emp-logos insert any auth` por owner-folder
   (`{companyId}` no es `auth.uid()` → keyear por columna `owner`).
4. Eliminar buckets `test` y `documentos_usuarios`.

## Alineación de código pendiente

- `ClientFileField` + `services/upload-client-file.ts` + endpoint `/files`:
  pasar `entityId` (memberId/managerId) y usar slots/rutas en inglés de esta
  spec (hoy: `socios/pasaporte/{uuid}` → objetivo: `members/{memberId}/passport`).
- En la promoción (Operaciones): copiar intake → `documents` + insertar metadata.
