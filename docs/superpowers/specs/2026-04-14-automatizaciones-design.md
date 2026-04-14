# Módulo Automatizaciones — Diseño

## Objetivo

Construir una página `/automatizaciones` en el dashboard de Cliente Fiel donde los tenants pueden configurar:

1. **Recordatorios personalizados** (Plan Medio+)
2. **Recompra automática post-visita** (Plan Premium)
3. **Sistema de puntos y recompensas** (Plan Premium)
4. **Campañas automáticas de retención** (Plan Premium)
5. **Generador de GiftCard** (Plan Premium, solo frontend)

---

## Arquitectura

### Backend (FastAPI, Hetzner VPS)

Directorio de referencia: `/var/www/clientefiel/repo/backend/app/`

**Modelos nuevos** (`app/models/`):
- `custom_reminder.py` — recordatorios personalizados por servicio
- `automation_settings.py` — config de recompra y puntos (1 fila por tenant)
- `campaign.py` — campañas de retención

**Router nuevo** (`app/api/automations.py`):
- CRUD para los 3 modelos
- Plan-gating en cada endpoint (403 si plan insuficiente)
- Registrado en `app/main.py`

**Tarea Celery nueva** (`app/tasks/automations.py`):
- `send_repurchase_message` — envía mensaje de recompra X días después de una visita
- `run_retention_campaigns` — tarea periódica (Celery Beat) que detecta clientes inactivos y envía campañas activas

**Migración Alembic**:
- Una migración con las 3 tablas nuevas

### Frontend (Next.js 14, Vercel)

**Página nueva**: `frontend/app/(dashboard)/automatizaciones/page.tsx`
- 4 secciones verticales con plan-gating visual
- Cada sección bloqueada muestra badge del plan requerido

**Sidebar**: `frontend/components/dashboard/Sidebar.tsx`
- Nuevo ítem "Automatizaciones" entre "Clientes" y "Configuración"

**Componentes nuevos** (`frontend/components/automations/`):
- `CustomRemindersSection.tsx`
- `RepurchaseSection.tsx`
- `PointsSection.tsx`
- `CampaignsSection.tsx`
- `GiftCardSection.tsx` + `GiftCardCanvas.tsx`

---

## Modelos de Datos

### `custom_reminders`

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| service_id | UUID FK → services, nullable | null = aplica a todos los servicios |
| message_text | TEXT | Soporta variables: {nombre}, {servicio}, {negocio}, {fecha} |
| days_before | INTEGER | Días de anticipación (1, 2, 3, 7…) |
| active | BOOLEAN | default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `automation_settings`

Una fila por tenant. Se crea automáticamente con valores default al primer acceso.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, UNIQUE | |
| repurchase_enabled | BOOLEAN | default false |
| repurchase_days_after | INTEGER | default 30 |
| repurchase_message | TEXT | Soporta variables: {nombre}, {servicio}, {negocio} |
| points_enabled | BOOLEAN | default false |
| points_per_visit | INTEGER | default 10 |
| points_redeem_threshold | INTEGER | default 100 |
| points_reward_description | TEXT | Descripción de la recompensa al canjear |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Modificación a tabla existente `bookings`

| Campo nuevo | Tipo | Descripción |
|---|---|---|
| repurchase_sent_at | TIMESTAMP, nullable | Fecha en que se envió el mensaje de recompra — evita duplicados |

### `campaigns`

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| name | VARCHAR(100) | Nombre interno de la campaña |
| message_text | TEXT | Soporta variables: {nombre}, {negocio} |
| trigger_type | ENUM('inactive_days') | Tipo de trigger — solo inactive_days en MVP |
| trigger_value | INTEGER | Días sin visita para activar (ej: 30, 60, 90) |
| active | BOOLEAN | default false |
| last_run_at | TIMESTAMP, nullable | Última vez que se ejecutó |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## Endpoints API

Base: `/api/v1/automations/`

### Recordatorios personalizados
- `GET /reminders` — lista recordatorios del tenant
- `POST /reminders` — crear recordatorio (Plan Medio+)
- `PUT /reminders/{id}` — editar recordatorio
- `DELETE /reminders/{id}` — eliminar recordatorio

### Configuración de automatización
- `GET /settings` — obtener config (crea con defaults si no existe)
- `PUT /settings` — actualizar config (Plan Premium para recompra y puntos)

### Campañas
- `GET /campaigns` — listar campañas del tenant
- `POST /campaigns` — crear campaña (Plan Premium)
- `PUT /campaigns/{id}` — editar campaña
- `DELETE /campaigns/{id}` — eliminar campaña
- `PATCH /campaigns/{id}/toggle` — activar/desactivar

Plan-gating: todos los endpoints de escritura retornan `403` si el tenant no tiene el plan requerido.

---

## Tareas Celery

### `send_repurchase_message(booking_id)`
- Se encola desde el endpoint `PATCH /api/v1/bookings/{id}/status` cuando el nuevo estado es `completed`
- ETA = `completed_at + repurchase_days_after días`
- Verifica al ejecutar: `repurchase_enabled == true` y tenant en plan Premium
- Usa credenciales WhatsApp del tenant (cifradas en DB)
- Template WhatsApp: `repurchase_reminder` (el tenant lo crea en Meta Business)
- Idempotente: verifica que no se haya enviado ya (campo `repurchase_sent_at` en booking)

### `run_retention_campaigns()`
- Tarea periódica Celery Beat: cada 24h
- Por cada tenant Premium con campañas activas:
  - Detecta clientes cuya última visita fue hace exactamente `trigger_value` días
  - Envía mensaje de campaña via WhatsApp
  - Actualiza `campaign.last_run_at`
- Idempotente: no envía dos veces al mismo cliente en el mismo ciclo

---

## Frontend — Secciones

### Plan-gating visual
- Si el plan es insuficiente: sección con opacidad reducida + overlay con badge "Requiere Plan X" + botón "Actualizar plan" → `/suscripcion`
- Si el plan es suficiente: sección completamente interactiva

### Sección A: Recordatorios personalizados (Plan Medio+)

- Tabla/lista de recordatorios configurados con columnas: Servicio, Mensaje (truncado), Días antes, Estado
- Botón "Agregar recordatorio" abre modal con:
  - Selector de servicio (o "Todos los servicios")
  - Campo de días antes (número)
  - Textarea para mensaje con variables disponibles listadas debajo
  - Instrucción de ejemplo: *"Ej: Hola {nombre}, te recordamos tu cita de {servicio} en {negocio} el {fecha}. ¡Te esperamos!"*
- Editar/eliminar inline

### Sección B: Recompra automática (Plan Premium)

- Toggle principal "Activar recompra automática"
- Campo: "Días después de la visita" (número, min 1, max 365)
- Textarea: mensaje de recompra
  - Variables disponibles: {nombre}, {servicio}, {negocio}
  - Ejemplo: *"Hola {nombre}, fue un placer atenderte. ¿Listo para tu próxima cita en {negocio}? Agenda ahora con un toque."*
- Botón "Guardar"

### Sección C: Sistema de puntos (Plan Premium)

- Toggle "Activar sistema de puntos"
- Campo: puntos por visita (número)
- Campo: puntos para canjear recompensa (número)
- Campo: descripción de la recompensa (texto libre, ej: "Descuento de 10%")
- Botón "Guardar"

### Sección D: Campañas de retención (Plan Premium)

- Lista de campañas con nombre, trigger, estado activo/inactivo, última ejecución
- Botón "Nueva campaña" abre modal con:
  - Nombre de la campaña
  - Días sin visita para activar (número)
  - Textarea para mensaje
  - Variables: {nombre}, {negocio}
  - Ejemplo: *"Hola {nombre}, ¡te extrañamos en {negocio}! Agenda tu próxima cita y obtén un regalo especial."*
- Toggle activo/inactivo por campaña
- Editar/eliminar inline

### Sección E: GiftCard (Plan Premium)

- Selector de tipo: "Descuento %" | "Servicio gratis"
- Si descuento: campo numérico (1–100%)
- Si servicio gratis: campo texto (nombre del servicio)
- Campo: fecha de expiración (opcional)
- Preview en tiempo real con canvas HTML5:
  - Fondo con gradiente Premium (violeta/cyan)
  - Logo/nombre del negocio (texto)
  - Texto de la oferta grande
  - Fecha expiración si aplica
- Botón "Descargar PNG" — usa `canvas.toDataURL('image/png')`

---

## Sidebar

Nuevo ítem en `Sidebar.tsx` entre "Clientes" y "Configuración":

```
⚡ Automatizaciones  →  /automatizaciones
```

---

## Variables de plantilla

Todas las secciones de texto soportan estas variables que se reemplazan al enviar:

| Variable | Valor |
|---|---|
| `{nombre}` | Nombre del cliente |
| `{servicio}` | Nombre del servicio |
| `{negocio}` | Nombre del negocio (tenant) |
| `{fecha}` | Fecha de la cita (solo para recordatorios) |

El reemplazo ocurre en el backend al momento de enviar, no al guardar.

---

## Consideraciones de seguridad

- Todos los endpoints filtran por `tenant_id` del token JWT (nunca aceptan `tenant_id` en el body)
- Plan-gating en backend, no solo en frontend
- Los tokens WhatsApp se descifran solo en memoria al enviar, nunca se serializan
- Las Celery tasks verifican plan y estado del tenant al ejecutarse (no solo al encolarse)
