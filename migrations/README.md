# Esquemas de Migración — n8n

Contratos JSON para importar datos al dashboard via n8n con Supabase service role.

## Orden de ejecución (estricto, por dependencias FK)

| # | Archivo | Tablas destino | Prerrequisitos |
|---|---------|---------------|----------------|
| 0 | `00-services.json` | `services`, `service_plans`, `service_plan_lines` | countries/states poblados |
| 1 | `01-identity.json` | `auth.users`, `usuarios`, `user_roles` | — |
| 2 | `02-company.json` | `companies`, `company_addresses` | user_id de fase 1 |
| 3 | `03-members.json` | `members`, `company_members`, `member_addresses` | user_id + company_id |
| 4 | `04-workflow.json` | `workflow.incorporation_workflows`, `workflow.incorporation_forms` | company.incorporation_id |
| 5 | `05-commercial.json` | `pagos`, `orders`, `order_lines` | user_id + services |
| 6 | `06-referrals.json` | `referidos` | partner_id + referido_id |

## Contrato completo

`cognito-forms-company.json` — Un caso completo de incorporación (user + company + members + workflow + docs). Usado cuando n8n procesa una entry de Cognito Forms de punta a punta.

## Estructura de cada schema

```json
{
  "_meta": {
    "phase": "nombre de fase",
    "description": "qué hace",
    "n8n_flow": "orden de inserts dentro de la fase",
    "depends_on": "fases previas requeridas",
    "idempotency": "clave de dedup para UPSERT"
  },
  "tabla": {
    "_meta": {
      "target_table": "schema.tabla real en Supabase",
      "required_on_insert": ["campos NOT NULL sin default"],
      "fk_resolve": { "campo": "cómo resolver la FK" }
    },
    "campo1": "valor o template {{variable}}",
    "campo2": null
  },
  "_enums": {
    "nombre_enum": ["valor1", "valor2"]
  }
}
```

## Convenciones

- `{{variable}}` — Valor que n8n debe resolver en runtime (encadenar del insert previo)
- `null` — Campo opcional, enviar null o no incluir
- `""` — Campo que requiere valor (string vacío = placeholder, reemplazar con dato real)
- `_helpers` / `_email` / `_us_resident` — Campos auxiliares para matching/dedup, **NO se insertan** en la tabla
- `_meta` — Metadata del schema, **NO se insertan** — filtrar antes del INSERT en n8n

## Conexión n8n → Supabase

Usar nodo **HTTP Request** con service role para bypasear RLS:

```
URL: {{SUPABASE_URL}}/rest/v1/tabla
Method: POST
Headers:
  apikey: {{SERVICE_ROLE_KEY}}
  Authorization: Bearer {{SERVICE_ROLE_KEY}}
  Content-Type: application/json
  Prefer: return=representation (para capturar el id insertado)
```

Para UPSERT:
```
Prefer: return=representation,resolution=merge-duplicates
```

Para auth.users (Admin API):
```
URL: {{SUPABASE_URL}}/auth/v1/admin/users
```

## Lookups necesarios (tablas de equivalencia)

Antes de correr la migración, construir en n8n diccionarios de lookup:

1. **countries**: nombre/código → `countries.id`
2. **states**: nombre → `states.id` (filtrar por country_id = US)
3. **activity**: código IRS → `activity.id`
4. **services**: nombre → `services.id`

## Validación post-carga (§7 del plan)

```sql
-- FKs huérfanas
SELECT * FROM companies WHERE user_id NOT IN (SELECT id FROM auth.users);
SELECT * FROM company_members WHERE company_id NOT IN (SELECT id FROM companies);
SELECT * FROM company_members WHERE member_id NOT IN (SELECT id FROM members);

-- Porcentajes por empresa
SELECT company_id, SUM(percentage) as total
FROM company_members WHERE is_active = true
GROUP BY company_id HAVING SUM(percentage) != 100;

-- Emails duplicados
SELECT correo, COUNT(*) FROM usuarios GROUP BY correo HAVING COUNT(*) > 1;

-- Conteos
SELECT 'usuarios' as tabla, COUNT(*) FROM usuarios
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'company_members', COUNT(*) FROM company_members
UNION ALL SELECT 'pagos', COUNT(*) FROM pagos
UNION ALL SELECT 'orders', COUNT(*) FROM orders;
```
