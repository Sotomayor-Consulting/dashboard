# Upgrade de plan — flujo end-to-end

Documenta cómo un cliente que contrató originalmente el **Plan Diseño** promueve su empresa al **Plan Business** mediante el servicio _Upgrade_, y cómo el sistema añade automáticamente las 10 etapas restantes del workflow de incorporación.

---

## 1. Modelo de negocio

| Servicio (`public.servicios`)   | Precio   | Plan asociado (`catalogs.service_plans`) | Stages que aplica |
| ------------------------------- | -------- | ---------------------------------------- | ----------------- |
| Plan Diseño - upgrade           | $350     | `diseno`                                 | 1 (planning_meeting) |
| Plan Básico                     | $350     | `basico`                                 | 4                 |
| Plan Estándar                   | $600     | `estandar`                               | 7                 |
| Plan Business                   | $950     | `business`                               | 11                |
| **Upgrade**                     | **$600** | **`upgrade`**                            | **11 (= Business)** |

Pagar `Plan Diseño` ($350) + `Upgrade` ($600) equivale a un `Plan Business` ($950). El servicio _Upgrade_ existe como un complemento que el cliente puede pagar después, una vez que ha probado el flujo de planificación inicial.

---

## 2. Estados y transiciones de la empresa

`empresas_incorporaciones.estado` es manejado automáticamente por el trigger `set_empresa_activa_trigger` en cada inserción/actualización de `pagos`:

| Servicio pagado          | Nuevo `estado`   |
| ------------------------ | ---------------- |
| Plan Diseño - upgrade    | `Upgrade`        |
| Cualquier otro (incluido `Upgrade`) | `Activo` |

Por eso, después de pagar el upgrade la empresa pasa de `Upgrade` → `Activo`.

---

## 3. Recorrido del usuario

```
┌──────────────────────────┐
│ Cliente paga Plan Diseño │   →  estado = 'Upgrade'
│ (Stripe Checkout)        │      workflow con 1 stage (planning_meeting)
└──────────────────────────┘
              │
              ▼
   Aparece en /upgrade como
   empresa elegible (filtro
   estado='Upgrade')
              │
              ▼
┌──────────────────────────┐
│ Cliente paga Upgrade     │   →  estado = 'Activo'
│ (Stripe Checkout)        │      se añaden las 10 stages faltantes
└──────────────────────────┘
              │
              ▼
   Card de la empresa muestra
   "★ PLAN BUSINESS"
```

---

## 4. Implementación técnica

### 4.1 Frontend

| Archivo                                               | Responsabilidad                                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/pages/upgrade.astro`                             | Page thin que monta el form de upgrade dentro del layout autenticado.                                    |
| `src/modules/forms/FormUpgrade.astro`                 | UI de la pantalla de upgrade: hero + card de beneficios + selector de empresa + breakdown de precio + CTA. |
| `src/modules/forms/upgrade/FormUpgrade.client.ts`     | Al enviar el form: llama al endpoint, recibe la URL de Stripe Checkout y redirige (`window.location.href`). |
| `src/lib/tablas/companies/empresa_incorporaciones.ts` | `getIncorporacionesUpgrade()` lista las empresas con `estado='Upgrade'` para poblar el selector.         |
| `src/lib/tablas/services/servicios.ts`                | `getServicioUpgrade()` recupera el servicio activo `nombre='Upgrade'` (precio + id).                     |
| `src/modules/companies/CompanyDashboard.astro`        | Resuelve el badge de plan: si el último pago es `Upgrade`, muestra `Plan Business`.                      |

### 4.2 API

| Endpoint                                          | Método | Descripción                                                                                                                                   |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/payment/checkout-session-upgrade`           | POST   | Crea la `stripe.checkout.sessions` con line items (servicio Upgrade + 4.5% fee de procesamiento) y metadata `payment_flow='upgrade'`.         |
| `/api/payment/webhook`                            | POST   | Recibe `checkout.session.completed`, extrae `payment_intent` y llama a la RPC `registrar_pago_desde_stripe`.                                  |

**Metadata enviada al PaymentIntent (clave para la lógica de DB):**

```json
{
	"servicio_id": "a3099b6b-bc7e-4e6f-8d7a-e9bd96508d3d",
	"user_id": "<uuid>",
	"empresa_incorporacion_id": "<uuid>",
	"payment_flow": "upgrade",
	"base_amount_cents": "60000",
	"fee_amount_cents": "2700",
	"plan_base_amount": "600",
	"fee_percent": "4.5"
}
```

### 4.3 Base de datos

#### Tablas

| Tabla                                            | Rol en este flujo                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `public.servicios`                               | Catálogo de servicios facturables (Plan Diseño, Upgrade, Plan Business, etc.).                                   |
| `catalogs.service_plans`                         | Mapea cada `servicio_id` a un plan estable (`slug`, `id` int) usado por el motor de workflow.                    |
| `workflow.workflow_stage_catalog`                | Catálogo maestro de las 11 stages del proceso de incorporación.                                                  |
| `workflow.workflow_stage_plan_applicability`     | Tabla de unión: qué stages aplica cada plan (ej. `business` → 11 stages, `upgrade` → mismas 11 que `business`).  |
| `workflow.task_templates`                        | Templates de tasks por stage; se clonan a `incorporation_tasks` al crear el workflow.                            |
| `workflow.incorporation_workflows`               | Una fila por empresa. Único punto de existencia del workflow.                                                    |
| `workflow.incorporation_workflow_stages`         | Instancias de stages del workflow de una empresa con su `status` y orden.                                        |
| `workflow.incorporation_tasks`                   | Tasks concretas instanciadas para cada stage de cada empresa.                                                    |
| `public.pagos`                                   | Cada pago `succeeded`. Disparador principal de toda la lógica vía triggers.                                      |

#### Triggers en `public.pagos`

| Trigger                                            | Función                                | Acción                                                                                                                       |
| -------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `trg_set_empresa_activa_on_pagos_ins_upd`          | `set_empresa_activa_trigger()`         | Si servicio = `Plan Diseño - upgrade` → empresa.estado = `Upgrade`. Cualquier otro → `Activo`.                               |
| `trg_pago_succeeded_create_workflow`               | `trg_pago_succeeded_handler()`         | Si NO existe workflow → llama a `workflow.create_workflow_for_incorporation`. Si YA existe → `workflow.append_missing_stages_for_plan`. |

#### Funciones de workflow

```sql
-- Existente: crea desde cero. Idempotente: sale si ya existe workflow.
workflow.create_workflow_for_incorporation(p_incorporation_id uuid, p_plan_id int) RETURNS uuid

-- Nueva (mayo 2026): añade solo las stages que faltan al workflow ya creado.
-- Idempotente: filtra con NOT EXISTS por (workflow_id, stage_id).
-- Si no existe workflow, delega a create_workflow_for_incorporation.
workflow.append_missing_stages_for_plan(p_incorporation_id uuid, p_plan_id int) RETURNS uuid
```

Las 11 stages del Plan Business / Upgrade son:

| Orden | Slug                  | Nombre                                       |
| ----- | --------------------- | -------------------------------------------- |
| 1     | `planning_meeting`    | Reunión de planificación y diseño LLC        |
| 2     | `client_form`         | Formulario de cliente                        |
| 3     | `state_registration`  | Registro estatal                             |
| 4     | `fiscal_documents`    | Obtención documentos fiscales                |
| 5     | `document_signing`    | Firma de documentos                          |
| 6     | `ein_request`         | Solicitud EIN                                |
| 7     | `boir_registration`   | Registro BOIR                                |
| 8     | `bank_account`        | Apertura cuenta bancaria                     |
| 9     | `stripe_account`      | Crear cuenta Stripe                          |
| 10    | `tax_election_8832`   | Elección tributación corporación (8832)      |
| 11    | `be13`                | BE-13                                        |

---

## 5. Secuencia completa (cliente paga Upgrade)

1. Cliente abre `/upgrade`.
2. `FormUpgrade.astro` carga sus empresas con `estado='Upgrade'` y el servicio Upgrade.
3. Cliente selecciona empresa y pulsa **Confirmar y pagar ahora**.
4. `FormUpgrade.client.ts` → `POST /api/payment/checkout-session-upgrade`.
5. El endpoint valida sesión, crea la `Checkout Session` en Stripe con metadata y devuelve `{ url }`.
6. Browser redirige al hosted Checkout de Stripe.
7. Cliente paga; Stripe envía `checkout.session.completed` al webhook.
8. `/api/payment/webhook` llama a la RPC `registrar_pago_desde_stripe(payment_intent_id)`.
9. La RPC inserta la fila en `public.pagos` con status `succeeded`.
10. Disparan los triggers en orden:
    - `set_empresa_activa_trigger`: empresa.estado pasa a `Activo`.
    - `trg_pago_succeeded_handler`: detecta que ya existe workflow → llama `append_missing_stages_for_plan('upgrade')` → inserta las 10 stages faltantes y sus tasks.
11. La página de la empresa, al renderizarse, recupera el último pago `succeeded` (servicio "Upgrade") y muestra **"★ PLAN BUSINESS"** gracias al mapping en `CompanyDashboard.astro`.

---

## 6. Idempotencia y reentry

- **Reintentos del webhook de Stripe** (mismo `event_id`): el insert en `pagos` tiene `ON CONFLICT (stripe_payment_intent_id) DO UPDATE`, así que reintenta sin duplicar filas.
- **`append_missing_stages_for_plan`**: filtra con `NOT EXISTS` por `(workflow_id, stage_id)`. Llamarla 5 veces produce el mismo resultado que llamarla una.
- **`create_workflow_for_incorporation`**: hace early return si ya existe workflow para esa incorporación.

---

## 7. Cómo agregar nuevos planes en el futuro

1. Insertar fila en `public.servicios` con nombre y precio.
2. Insertar fila en `catalogs.service_plans` apuntando al `servicio_id`.
3. Mapear las stages aplicables en `workflow.workflow_stage_plan_applicability`.
4. (Opcional) Si el plan se usa como upgrade desde otro plan menor, no hay nada extra que hacer: el trigger `trg_pago_succeeded_handler` detecta workflow existente y añade automáticamente las stages faltantes.

---

## 8. Troubleshooting

| Síntoma                                                   | Causa probable                                                                            | Resolución                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Webhook responde 500 al primer `checkout.session.completed` | Race condition: la RPC lee `stripe.payments` (FDW) antes de que sincronice el PI.         | Stripe reintenta. Pendiente: refactor del webhook para leer la metadata directo del evento. |
| Pago registrado pero sin nuevas stages                    | El servicio no tiene fila en `catalogs.service_plans`, o el plan no tiene stages mapeadas. | Verificar `service_plans` y `workflow_stage_plan_applicability`.                            |
| Badge muestra "UPGRADE" en vez de "PLAN BUSINESS"         | El último pago es el servicio Upgrade.                                                    | El mapping ya está en `CompanyDashboard.astro` (`rawPlanName === 'upgrade'` → `Plan Business`). |
| Empresa no aparece en `/upgrade`                          | `getIncorporacionesUpgrade` filtra `estado='Upgrade'`. Si ya está `Activo`, no aparece.   | Esperado tras el upgrade. Si está `En proceso`, aún no pagó el Plan Diseño - upgrade.       |

---

## 9. Migraciones aplicadas

| Migración                                       | Fecha     | Descripción                                                                                                                  |
| ----------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `add_upgrade_plan_and_stages`                   | 2026-05-05 | Inserta el plan `upgrade` en `catalogs.service_plans` y mapea sus 11 stages (mismas que `business`).                         |
| `workflow_append_missing_stages_for_plan`       | 2026-05-05 | Crea `workflow.append_missing_stages_for_plan` y reescribe `trg_pago_succeeded_handler` para que use append cuando aplique. |
