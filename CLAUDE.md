## 🧠 PROPÓSITO

Este documento establece estándares para el desarrollo de **Cliente Fiel** — SaaS de reservas y fidelización que automatiza el WhatsApp Business de cada cliente.

- **Backend:** FastAPI (Python) → Railway / Render / VPS
- **Frontend:** Next.js 14 (TypeScript) → Vercel
- **DB:** PostgreSQL + Redis
- **Jobs:** Celery + Celery Beat
- **Mercado:** Chile — pricing en USD

---

## 🧠 MODELO WHATSAPP (REGLA FUNDAMENTAL)

> **"Cliente Fiel automatiza el WhatsApp Business del cliente. NO es un proveedor de WhatsApp, NO administra cuentas."**

### Correcto:
- Cada tenant conecta **su propio** WhatsApp Business
- Sus credenciales (`phone_number_id` + `access_token`) se guardan **cifradas (AES-256)** en DB bajo su `tenant_id`
- El sistema usa SUS credenciales para enviar mensajes en su nombre

### Prohibido:
- ❌ Cuenta central de WhatsApp de Cliente Fiel
- ❌ Compartir credenciales entre tenants
- ❌ Crear o administrar cuentas WhatsApp por el cliente
- ❌ Exponer tokens WhatsApp en frontend, logs o respuestas API

---

## 🚨 PRINCIPIOS FUNDAMENTALES

1. **Seguridad primero — especialmente credenciales WhatsApp por tenant**
2. **Claridad sobre complejidad**
3. **Código auditable y trazable**
4. **Automatización sobre procesos manuales**
5. **Escalabilidad desde el diseño**
6. **Menos es más — MVP funcional antes que feature-complete**

---

## 🏗️ ARQUITECTURA DE CAPAS

```
Frontend (Next.js → Vercel)
    ↓ REST/JSON — nunca expone secrets
Backend (FastAPI → Railway/Render)
    ↓ Services
Lógica de negocio
    ↓ ORM (SQLAlchemy)
PostgreSQL — credenciales WA cifradas por tenant
    ↓ Broker
Redis → Celery Workers (reminders, campañas)
    ↓ Meta Cloud API
WhatsApp Business de cada tenant (sus propias credenciales)
```

### Reglas de capas:
- ❌ Lógica de negocio en routers
- ❌ Queries SQL directas fuera de modelos
- ❌ Acceso a DB desde frontend
- ✅ Services para lógica de negocio
- ✅ Schemas Pydantic en entrada Y salida
- ✅ `Depends()` para inyección de dependencias

---

## 🗄️ BASE DE DATOS

### Stack: PostgreSQL 16 + SQLAlchemy 2.0 + Alembic

### Estándares:
- UUID como primary key en todas las tablas
- Campos: `id`, `tenant_id`, `created_at`, `updated_at`
- Foreign keys declaradas explícitamente
- Índices en: `tenant_id`, `created_at`, campos de búsqueda
- RLS habilitado como segunda capa de aislamiento

### Multi-tenancy — regla absoluta:
```python
# ✅ SIEMPRE filtrar por tenant_id
bookings = db.query(Booking).filter(
    Booking.tenant_id == current_tenant.id,
    Booking.id == booking_id
).first()

# ❌ PELIGROSO — fuga entre tenants
bookings = db.query(Booking).filter(Booking.id == booking_id).first()
```

### Migraciones: solo via Alembic. Nunca DDL directo en producción.

---

## 🔐 SEGURIDAD

### Autenticación:
```python
# JWT — python-jose
# Access token: 30 minutos
# Refresh token: 7 días (httpOnly cookie)
# Bcrypt — Passlib para contraseñas
```

### Credenciales WhatsApp (crítico):
```python
# Cifrado AES-256 con cryptography.Fernet antes de guardar
# Descifrado solo en memoria, al momento de usar
# Nunca serializar token descifrado a JSON
# Nunca loguear token (ni parcialmente)
```

### Headers Next.js (next.config.js — obligatorio):
```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
]
```

### Variables de entorno:
- Backend: `.env` (Railway/Render env vars en producción)
- Frontend: `.env.local` (Vercel env vars en producción)
- `NEXT_PUBLIC_` solo para datos no sensibles (URL del API, Meta App ID público)
- ❌ Nunca: JWT secret, WhatsApp tokens, Stripe secret en frontend

### Validación de webhooks:
- Meta: validar `X-Hub-Signature-256` en CADA request
- Stripe: `stripe.webhooks.construct_event` con `STRIPE_WEBHOOK_SECRET`

---

## 🌐 SEGURIDAD AVANZADA

- Rate limiting: `slowapi` + Redis (por IP y por tenant)
- CORS: solo `FRONTEND_URL` permitido en producción
- SQL: solo SQLAlchemy ORM — nunca raw SQL con input de usuario
- SSRF: solo llamadas permitidas a `graph.facebook.com` y `api.stripe.com`
- HTTPS: obligatorio en todos los entornos (Vercel + reverse proxy backend)

---

## 🔁 CELERY — TAREAS ASÍNCRONAS

### Reglas:
- ✅ Idempotentes — re-ejecutar no causa mensajes duplicados
- ✅ Retry con backoff: `max_retries=3, countdown=2^attempt * 60`
- ✅ Logging por tarea: `task_id`, `tenant_id`, resultado
- ❌ No enviar mensajes WhatsApp en requests síncronos

### Tareas MVP:
```python
send_booking_confirmation.delay(booking_id)
send_reminder_24h.apply_async(args=[booking_id], eta=dt_24h_before)
send_reminder_1h.apply_async(args=[booking_id], eta=dt_1h_before)
```

### Tareas Post-MVP:
```python
process_repurchase_messages.delay(tenant_id)
process_loyalty_campaigns.delay(tenant_id)
calculate_tenant_metrics.delay(tenant_id)
```

---

## 📲 INTEGRACIÓN WHATSAPP — META CLOUD API

### Por cada envío:
```python
# Recuperar credenciales del tenant desde DB
conn = get_whatsapp_connection(tenant_id)
phone_number_id = conn.phone_number_id
access_token = decrypt(conn.access_token_enc)  # descifrar en memoria

# Llamar Meta API con SUS credenciales
response = await httpx.post(
    f"https://graph.facebook.com/v19.0/{phone_number_id}/messages",
    headers={"Authorization": f"Bearer {access_token}"},
    json={...}
)
# Eliminar token de memoria después del uso
del access_token
```

### Templates requeridos (el cliente los crea en su Meta Business):
- Confirmación de reserva
- Recordatorio 24h
- Recordatorio 1h
- Mensaje de recompra (Plan Medio+)
- Mensaje de fidelización (Plan Premium)

### Webhook de Meta:
```
POST /api/webhooks/whatsapp
→ Validar X-Hub-Signature-256
→ Identificar tenant por phone_number_id
→ Enqueue en Celery para procesamiento async
→ Responder 200 OK en < 20 segundos
```

---

## 💳 PAGOS — STRIPE

- ✅ Validar webhook signature en cada evento
- ✅ Estado de suscripción: siempre actualizado via webhook, nunca via redirect
- ✅ Idempotency keys en llamadas a Stripe API
- ❌ No almacenar datos de tarjeta

---

## 🧪 TESTING

**Stack:** pytest + pytest-asyncio + httpx / Jest + Testing Library

**Cobertura mínima:** 70%

**Obligatorio:**
- Services (lógica de negocio)
- Webhooks: caso válido + firma inválida + payload malformado
- Multi-tenant: verificar que datos no cruzan entre tenants
- WhatsApp service: mock httpx, no llamadas reales en tests
- Flujo completo: reserva → reminder programado → envío

---

## 📊 LOGGING

### Formato: JSON estructurado (stdout):
```python
{
  "level": "info|warn|error",
  "timestamp": "ISO8601",
  "tenant_id": "uuid",
  "event": "booking.created | reminder.sent | webhook.received",
  "booking_id": "uuid",    # si aplica
  "duration_ms": 45
}
```

### Registrar: autenticación, reservas, envíos WA (éxito/fallo), webhooks, suscripciones

### Prohibido en logs:
- ❌ Contraseñas, JWT tokens
- ❌ WhatsApp `access_token` (ni parcialmente)
- ❌ Datos de tarjeta
- ❌ Contenido de mensajes de usuarios finales

---

## ⚠️ MANEJO DE ERRORES

```python
# Backend
raise HTTPException(404, "Booking not found")
raise HTTPException(403, "Tenant access denied")
raise HTTPException(422, "Invalid time slot")
raise HTTPException(503, "WhatsApp service temporarily unavailable")
# Nunca exponer stack traces en producción

# Frontend
# Error boundaries + toasts + retry en TanStack Query para 5xx
# Estado específico: "WhatsApp no conectado" → guiar al onboarding
```

---

## 🧼 CALIDAD DE CÓDIGO

### Python:
- Type hints en todas las funciones
- Funciones ≤ 50 líneas
- Nombres en inglés

### TypeScript:
- Sin `any`
- Props tipadas con interfaces
- Componentes funcionales

### Prohibido: `console.log` / `print()` en producción, funciones > 50 líneas, duplicación de lógica

---

## 📦 COMMITS (Conventional Commits)

```
feat: agregar confirmación automática de reserva por WhatsApp
fix: corregir descifrado de token WhatsApp en edge case
refactor: mover lógica de envío a whatsapp_service
chore: actualizar dependencias de seguridad
test: agregar test de aislamiento multi-tenant
```

### Branches: `main` → producción | `staging` | `feat/<nombre>` | `fix/<nombre>`

---

## 🚀 DESPLIEGUE

### Frontend → Vercel
- Deploy automático desde `main`
- Preview deployments en PRs
- Variables en Vercel Dashboard (no en código)

### Backend → Railway / Render
- Dockerfile en `backend/`
- Variables de entorno en panel del hosting
- PostgreSQL y Redis como servicios managed o external

### CI/CD (GitHub Actions):
1. Lint + type check
2. Tests con PostgreSQL + Redis reales
3. Build Docker (backend)
4. Deploy staging → smoke tests
5. Deploy producción (aprobación manual)

---

## 🧠 REGLA FINAL

> Si compromete seguridad, aislamiento de tenants, o la integridad de las credenciales WhatsApp de los clientes — está prohibido.

*Última actualización: 2026-03-30*
