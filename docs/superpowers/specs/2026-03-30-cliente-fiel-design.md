# Cliente Fiel — Spec de Diseño del Sistema

**Fecha:** 2026-03-30
**Estado:** Aprobado
**Versión:** 1.0

---

## Resumen

Cliente Fiel es un SaaS B2B para PYMEs chilenas que automatiza el WhatsApp Business de cada cliente para gestionar reservas, enviar recordatorios y fidelizar clientes. Sin apps que instalar para el cliente final. Sin NLP ni IA en el MVP — todo funciona con flujos predefinidos y mensajes interactivos de WhatsApp.

---

## Principio fundamental — Modelo WhatsApp

> Cliente Fiel **automatiza** el WhatsApp Business del cliente. No lo provee ni lo administra.

Cada tenant conecta **su propio** WhatsApp Business via Meta Embedded Signup (OAuth). Sus credenciales (`phone_number_id` + `access_token`) se almacenan cifradas (AES-256) en DB bajo su `tenant_id`. El sistema usa SUS credenciales para enviar mensajes en su nombre.

**Prohibido:**
- Cuenta central de WhatsApp de Cliente Fiel
- Compartir credenciales entre tenants
- Exponer `access_token` en frontend, logs o mensajes de error

---

## Sección 1 — Arquitectura y Flujos

### Stack

| Capa | Tecnología | Hosting |
|------|-----------|---------|
| Frontend | Next.js 14 App Router (TypeScript) | Vercel |
| Backend | FastAPI (Python) | Railway / Render |
| Base de datos | PostgreSQL 16 + SQLAlchemy 2.0 + Alembic | Railway managed |
| Cache / Broker | Redis 7 | Railway managed |
| Jobs | Celery + Celery Beat | mismo host que backend |
| WhatsApp | Meta Cloud API (credenciales por tenant) | — |
| Pagos | Stripe | — |
| Cifrado | cryptography (Fernet / AES-256) | — |

### Diagrama de capas

```
Next.js (Vercel)
    ↓ REST/JSON — nunca expone secrets
FastAPI (Railway/Render)
    ↓ Services — lógica de negocio
SQLAlchemy ORM
    ↓
PostgreSQL — credenciales WA cifradas por tenant
    ↓ Broker
Redis → Celery Workers (reminders, campañas, métricas)
    ↓ httpx (timeout=5s)
Meta Cloud API — WhatsApp Business de cada tenant
```

### Flujo crítico 1 — Reserva vía WhatsApp

```
Cliente final envía mensaje al número del negocio
    ↓
Meta → POST /api/webhooks/whatsapp
    ↓
Validar X-Hub-Signature-256
    ↓
Verificar idempotencia (meta_message_id ya procesado → ignorar)
    ↓
Identificar tenant por phone_number_id
    ↓
Cargar estado de conversación desde Redis (TTL 30 min)
    ↓
Avanzar estado de la máquina (sin NLP — botones interactivos)
    ↓
Crear booking en DB cuando el flujo completa
    ↓
Celery agenda: reminder_24h + reminder_1h
    ↓
Responder 200 OK a Meta en < 20 segundos
```

### Flujo crítico 2 — Onboarding WhatsApp (Embedded Signup)

```
Admin dashboard → botón "Conectar con Meta"
    ↓
JS SDK Meta abre popup OAuth
    ↓
Usuario autoriza su WhatsApp Business
    ↓
Frontend recibe: { code, phone_number_id, waba_id }
    ↓
POST /api/v1/whatsapp/connect { code, phone_number_id, waba_id }
    ↓
Backend intercambia code → long-lived access_token (Meta Graph API)
    ↓
Si ya existe conexión previa → invalidar y reemplazar (UNIQUE por tenant)
    ↓
Cifra token con Fernet(ENCRYPTION_KEY)
    ↓
Guarda en whatsapp_connections
    ↓
Envía mensaje de verificación al número
    ↓
Retorna { status: "connected", phone_number: "+56912345678" }
```

El usuario nunca ve ni ingresa credenciales manualmente.

### Flujo de reserva vía WhatsApp (máquina de estados — sin NLP)

```
[inicio] → mensaje de bienvenida + lista de servicios (WhatsApp List Message)
    ↓ usuario selecciona servicio
[servicio_seleccionado] → disponibilidad horaria (botones interactivos)
    ↓ usuario selecciona horario
[horario_seleccionado] → confirmación con resumen (botones: Confirmar / Cancelar)
    ↓ usuario confirma
[completado] → template de confirmación enviado → booking creado en DB
```

Estado de conversación en Redis: `conv:{phone_number}:{tenant_id}` con TTL de 30 minutos.

---

## Sección 2 — Páginas y UI

### Route Groups Next.js

```
app/
├── (marketing)/          — Landing, Pricing, Features, Blog, FAQ
├── (auth)/               — Login, Registro, Reset password
├── (dashboard)/          — Área autenticada
│   ├── agenda/           — Vista semanal de reservas
│   ├── clientes/         — Lista + detalle de clientes
│   ├── configuracion/    — Servicios, horarios, templates
│   ├── whatsapp/         — Estado conexión + botón conectar
│   ├── logs/             — message_logs (solo admin)
│   └── suscripcion/      — Plan activo, facturación
└── onboarding/           — Flujo post-registro: conectar WhatsApp
```

### Landing Page

- **Hero:** headline + subheadline + CTA "Prueba gratis 14 días — Sin tarjeta"
- **¿Cómo funciona?** — 3 pasos visuales (conecta WA → configura → clientes reservan solos)
- **Features por plan** — comparativa visual
- **Pricing** — 3 planes con toggle, CTA por plan
- **Industrias** — peluquería, spa, consultorio, restaurante, taller
- **FAQ** — con schema JSON-LD FAQPage
- **Footer** + CTAs reducción de fricción: "Sin tarjeta hasta el día 14", "Cancela cuando quieras"

### Onboarding post-registro (flujo guiado)

```
Paso 1: Bienvenida + explicación de prerequisito (necesitas WhatsApp Business)
Paso 2: Botón "Conectar con Meta" → Embedded Signup popup
Paso 3: Verificación automática (mensaje de prueba)
Paso 4: Configurar primer servicio
Paso 5: Configurar horarios disponibles
Paso 6: Dashboard listo
```

### Dashboard — Agenda semanal

- Vista de 7 días con bloques horarios
- Click en reserva: detalle, opciones (completar / cancelar / no-show)
- Contador: reservas del día, pendientes, completadas

### Dashboard — Clientes

- Lista paginada: nombre, teléfono, última visita, próxima cita
- Detalle: historial de reservas, puntos (premium), botón nueva reserva manual

### Dashboard — WhatsApp

- Estado de conexión: conectado ✅ / desconectado ❌
- Número conectado y fecha de verificación
- Botón "Reconectar" (inicia nuevo Embedded Signup)

---

## Sección 3 — Modelos de Datos

### Tablas PostgreSQL (10)

#### `tenants`
```sql
id UUID PK, name TEXT, slug TEXT UNIQUE,
plan ENUM(basic, medium, premium),
status ENUM(trial, active, canceled, past_due),
trial_ends_at TIMESTAMPTZ, created_at, updated_at
```

#### `users`
```sql
id UUID PK, tenant_id UUID FK,
email TEXT UNIQUE, password_hash TEXT,
role ENUM(admin, staff),
is_active BOOLEAN, created_at, updated_at
```

#### `whatsapp_connections`
```sql
id UUID PK, tenant_id UUID FK UNIQUE,
phone_number_id TEXT NOT NULL,
phone_number TEXT NOT NULL,
access_token_enc BYTEA NOT NULL,   -- AES-256 Fernet
token_expires_at TIMESTAMPTZ,
meta_waba_id TEXT,
is_active BOOLEAN DEFAULT true,
verified_at TIMESTAMPTZ,
created_at, updated_at
```

#### `services`
```sql
id UUID PK, tenant_id UUID FK,
name TEXT, duration_minutes INT, price NUMERIC(10,2),
is_active BOOLEAN DEFAULT true,
created_at, updated_at
```

#### `time_slots`
```sql
id UUID PK, tenant_id UUID FK,
day_of_week INT (0-6), start_time TIME, end_time TIME,
max_concurrent INT DEFAULT 1,
is_active BOOLEAN DEFAULT true
```

#### `customers`
```sql
id UUID PK, tenant_id UUID FK,
phone_number TEXT,                 -- UNIQUE per tenant
name TEXT,
last_booking_at TIMESTAMPTZ,
total_bookings INT DEFAULT 0,
points_balance INT DEFAULT 0,
status ENUM(active, vip, churned),
created_at, updated_at
UNIQUE(tenant_id, phone_number)
```

#### `bookings`
```sql
id UUID PK, tenant_id UUID FK,
customer_id UUID FK, service_id UUID FK,
scheduled_at TIMESTAMPTZ,
status ENUM(pending, confirmed, completed, canceled, no_show),
reminder_24h_sent_at TIMESTAMPTZ,
reminder_1h_sent_at TIMESTAMPTZ,
notes TEXT,
created_by ENUM(whatsapp, admin),
created_at, updated_at
```

#### `reminders`
```sql
id UUID PK, tenant_id UUID FK, booking_id UUID FK,
type ENUM(confirmation, reminder_24h, reminder_1h, repurchase),
scheduled_for TIMESTAMPTZ,
sent_at TIMESTAMPTZ,
status ENUM(pending, sent, failed),
celery_task_id TEXT
```

#### `message_logs`
```sql
id UUID PK, tenant_id UUID FK,
customer_id UUID FK nullable, booking_id UUID FK nullable,
type ENUM(confirmation, reminder_24h, reminder_1h, campaign, system),
status ENUM(pending, sent, failed),
provider_message_id TEXT nullable,   -- ID de Meta
error_message TEXT nullable,         -- solo tipo de error, sin tokens
created_at
```
**Regla:** nunca guardar contenido del mensaje ni payload completo de Meta.

#### `subscriptions`
```sql
id UUID PK, tenant_id UUID FK UNIQUE,
stripe_customer_id TEXT, stripe_subscription_id TEXT,
plan ENUM(basic, medium, premium),
status ENUM(trial, active, canceled, past_due),
current_period_end TIMESTAMPTZ,
cancel_at TIMESTAMPTZ,
created_at, updated_at
```

### Estado de conversación — Redis (no DB)

```
key:   conv:{phone_number}:{tenant_id}
value: { step, selected_service_id, selected_date, expires_at }
TTL:   30 minutos
```

### Multi-tenancy

- Toda query filtra por `tenant_id` — extraído del JWT, nunca del body del request
- PostgreSQL RLS habilitado como segunda capa
- Índices en: `tenant_id`, `created_at`, campos de búsqueda frecuente

---

## Sección 4 — API y Seguridad

### Endpoints

#### Auth `/api/v1/auth/`
```
POST /register          — crear tenant + usuario admin
POST /login             — retorna access_token (body) + refresh_token (httpOnly cookie)
POST /refresh           — usa refresh_token cookie → nuevo access_token
POST /logout            — invalida refresh_token
```

#### WhatsApp `/api/v1/whatsapp/`
```
POST /connect           — recibe code OAuth → intercambia → cifra → guarda (reemplaza si existe)
GET  /status            — estado de conexión del tenant
POST /disconnect        — elimina credenciales
POST /test              — mensaje de prueba al propio número
```

#### Servicios y Horarios
```
GET  /api/v1/services               — listar servicios del tenant
POST /api/v1/services               — crear servicio (admin)
PATCH/DELETE /api/v1/services/{id}  — editar / desactivar (admin)
GET  /api/v1/time-slots
POST /api/v1/time-slots             — (admin)
PATCH/DELETE /api/v1/time-slots/{id}
```

#### Clientes `/api/v1/clients/`
```
GET  /                — lista paginada con filtros
GET  /{id}            — detalle + historial
PATCH /{id}           — actualizar nombre/notas (admin)
```

#### Reservas `/api/v1/bookings/`
```
GET  /                          — lista con filtros (fecha, estado)
POST /                          — crear reserva manual (admin/staff)
GET  /{id}
PATCH /{id}/cancel              — (admin/staff)
PATCH /{id}/complete            — (admin/staff)
PATCH /{id}/no-show             — (admin/staff)
```

#### Dashboard `/api/v1/dashboard/`
```
GET /summary            — reservas hoy, semana, clientes activos
GET /agenda?week=       — reservas de la semana
```

#### Suscripciones `/api/v1/subscriptions/`
```
POST /checkout          — crea sesión Stripe Checkout
GET  /status            — plan activo, fecha renovación
POST /portal            — portal de facturación Stripe
```

#### Logs `/api/v1/logs/`
```
GET /messages           — message_logs paginados
                          filtros: ?status=&type=&date_from=&date_to=
```

#### Webhooks `/api/webhooks/`
```
GET  /whatsapp          — verificación Meta (challenge)
POST /whatsapp          — mensajes entrantes → validar firma → idempotencia → Celery
POST /stripe            — eventos Stripe → validar firma → actualizar suscripción
```

### Autenticación JWT

```
access_token:
  - En header: Authorization: Bearer <token>
  - Duración: 30 minutos
  - Contiene: user_id, tenant_id, role

refresh_token:
  - En cookie httpOnly (nunca en body ni header)
  - Duración: 7 días
  - Solo usado en POST /auth/refresh
```

**Regla:** nunca mezclar los dos mecanismos.

### Seguridad por capas

**Capa 1 — Auth JWT**
- Middleware valida token en cada request protegido
- `tenant_id` extraído del token, nunca del body

**Capa 2 — Roles**
- `admin`: acceso completo al tenant
- `staff`: acceso a agenda, clientes, no a configuración ni logs ni suscripción

**Capa 3 — Multi-tenant**
- Imposible acceder datos de otro tenant aunque se manipule el request

**Capa 4 — Rate limiting** (slowapi + Redis)
```
POST /api/v1/auth/login    → 5 req / 15 min por IP
/api/v1/*                  → 100 req / min por tenant
/api/webhooks/whatsapp     → sin límite estricto (solo validación de firma)
/api/webhooks/stripe       → sin límite estricto (solo validación de firma)
```

**Capa 5 — Validación de webhooks**
```python
# Meta: X-Hub-Signature-256
hmac.compare_digest(expected_signature, received_signature)

# Stripe
stripe.webhooks.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
```

**Capa 6 — Idempotencia en webhooks WhatsApp**
- Guardar `meta_message_id` de cada mensaje procesado (Redis con TTL 24h)
- Si llega duplicado → responder 200 OK sin reprocesar

**Capa 7 — Credenciales WhatsApp**
```python
access_token = decrypt(conn.access_token_enc)  # solo en memoria
# ... uso ...
del access_token  # eliminar inmediatamente

# Nunca en logs, nunca en errores, nunca en respuestas API
```

**Capa 8 — Timeout en llamadas externas**
```python
async with httpx.AsyncClient(timeout=5.0) as client:
    response = await client.post(meta_api_url, ...)
```

### Tareas Celery (MVP)

```python
# Inmediatas
send_booking_confirmation.delay(booking_id)

# Programadas
send_reminder_24h.apply_async(args=[booking_id], eta=dt_24h_before)
send_reminder_1h.apply_async(args=[booking_id], eta=dt_1h_before)
```

**Reglas Celery:**
- Idempotentes: re-ejecutar no causa duplicados
- Retry con backoff: `max_retries=3, countdown=2^attempt * 60`
- Cada tarea crea/actualiza `message_log` con status pending → sent/failed

---

## Planes del Producto

| Plan | Precio | Features |
|------|--------|---------|
| Básico | $29 USD/mes | Reservas WA, confirmación automática, 3 recordatorios |
| Medio | $59 USD/mes | + mensajes de recompra post-visita, recurrencia por cliente |
| Premium | $99 USD/mes | + puntos/recompensas, campañas automáticas, segmentación, métricas LTV |

**Trial:** 14 días sin requerir tarjeta.

---

## Fuera de Scope — MVP

- NLP / IA para interpretar mensajes de WhatsApp
- OAuth Meta Embedded Signup v2 ya es el MVP (no v2)
- Historial completo de mensajes (solo `message_logs` sin contenido)
- Plan Medio y Premium (implementar post-MVP)
- Sistema de puntos
- Campañas automáticas
- Métricas avanzadas (LTV, churn)
- Blog
- App móvil

---

## Consideraciones de Despliegue

```
Frontend → Vercel (deploy automático desde main)
Backend  → Railway / Render (Docker)
DB       → PostgreSQL managed (Railway)
Redis    → Redis managed (Railway / Upstash)

CI/CD (GitHub Actions):
1. Lint + type check
2. Tests (PostgreSQL + Redis reales, no mocks)
3. Build Docker backend
4. Deploy staging → smoke tests
5. Deploy producción (aprobación manual)
```

---

## Decisiones de Diseño Clave

1. **Meta Embedded Signup en MVP** (no entrada manual de credenciales) — simplifica onboarding, reduce errores de usuario
2. **Sin NLP en MVP** — WhatsApp Interactive Messages (botones/listas) son más confiables y no requieren IA
3. **message_logs sin contenido** — trazabilidad operativa sin riesgo de privacidad ni sobrecarga de DB
4. **Estado de conversación en Redis** (no DB) — TTL automático, sin garbage collection manual
5. **refresh_token en httpOnly cookie** — protección contra XSS en frontend
6. **tenant_id siempre del JWT** — nunca del body, imposible spoofear
7. **Idempotencia en webhooks** — Meta puede reenviar eventos, Redis guarda IDs procesados con TTL 24h
