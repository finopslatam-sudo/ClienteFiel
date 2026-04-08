# 📋 CLIENTE FIEL — CONTEXTO DEL PROYECTO

## 🎯 Producto

**Cliente Fiel** es un SaaS B2B para pequeñas y medianas empresas chilenas que necesitan:
- Gestionar reservas de clientes sin apps ni formularios complejos
- Automatizar recordatorios vía su propio WhatsApp Business
- Aumentar la recurrencia y fidelización de clientes

**Propuesta de valor:**
> "Una herramienta que automatiza el uso del WhatsApp Business del cliente. No somos un proveedor de WhatsApp — somos el motor que lo hace trabajar por ti."

**Modelo de negocio:**
- SaaS con suscripción mensual en USD
- Mercado objetivo: PYMEs en Chile
- Canales de adquisición: landing page (conversión) + redes sociales (marketing/awareness)
- Redes: Instagram, TikTok, Facebook → solo marketing, NO conversión
- Conversión y comparación: exclusivamente en clientefiel.cl

**Prerequisito del cliente:** Debe tener un número de WhatsApp Business activo. Cliente Fiel orienta sobre cómo obtenerlo pero no lo provee.

---

## 🧠 MODELO WHATSAPP (CRÍTICO)

### ¿Qué hace Cliente Fiel con WhatsApp?

> **"Automatiza el WhatsApp Business del cliente — no lo administra ni lo provee."**

Cada cliente (tenant) conecta **su propio** WhatsApp Business dentro de su cuenta en la plataforma. Cliente Fiel guarda sus credenciales de forma segura y las usa para automatizar envíos según las reglas configuradas.

### Flujo correcto:
```
Cliente contrata el servicio
    ↓
Entra al dashboard y conecta su WhatsApp Business
    ↓
Provee sus propias credenciales Meta API:
  - phone_number_id (de su Meta Business)
  - access_token (token permanente de su app Meta)
    ↓
Backend guarda credenciales cifradas (AES-256) en DB por tenant
    ↓
Motor automatiza envíos usando SUS credenciales:
  - confirmaciones de reserva
  - recordatorios programados
  - campañas de recompra / fidelización
```

### Reglas de oro:
- ✅ Cada tenant tiene sus propias credenciales en DB
- ✅ Credenciales cifradas con AES-256 en reposo
- ✅ Nunca se exponen credenciales en frontend ni en logs
- ❌ NO existe cuenta central de WhatsApp de Cliente Fiel
- ❌ NO se comparten credenciales entre tenants
- ❌ NO se crean ni administran cuentas WhatsApp por el cliente

### Dos formas de conexión (MVP → v2):
**MVP:** El cliente entra a su Meta Business Manager, genera su token de acceso permanente y lo pega en el dashboard de Cliente Fiel (simple, funciona, manual).

**v2:** Flujo OAuth con Meta Embedded Signup embebido en el dashboard para conexión con un clic.

---

## 🏗️ STACK TECNOLÓGICO DEFINIDO

### Backend — FastAPI (Python) → Hosting separado (Railway / Render / VPS)

| Componente | Tecnología | Razón |
|-----------|-----------|-------|
| Framework | FastAPI 0.110+ | Async, validación automática, OpenAPI |
| ORM | SQLAlchemy 2.0 + Alembic | Migraciones, multi-tenant via `tenant_id` |
| Base de datos | PostgreSQL 16 | ACID, JSON, multi-tenant |
| Cache / Broker | Redis 7 | Rate limiting, sesiones, Celery broker |
| Jobs / Cron | Celery + Celery Beat | Recordatorios y campañas programadas |
| Auth | python-jose (JWT) + Passlib (bcrypt) | Estándar seguro |
| Pagos | PayPal SDK + Mercado Pago SDK + Transbank SDK | Suscripciones recurrentes, webhooks |
| WhatsApp | Meta Cloud API (credenciales del cliente) | Por tenant, sin cuenta central |
| Cifrado tokens | cryptography (Fernet/AES-256) | Proteger credenciales WhatsApp |
| Validación | Pydantic v2 | Input validation automático |
| HTTP Client | httpx | Async HTTP para Meta API |

### Frontend — Next.js 14 (App Router) → Vercel

| Componente | Tecnología | Razón |
|-----------|-----------|-------|
| Framework | Next.js 14 (App Router) | SSR/SSG/ISR, SEO nativo |
| Lenguaje | TypeScript 5 | Type safety |
| Estilos | Tailwind CSS 3 | Dark mode, responsive, utilities |
| Componentes UI | shadcn/ui | Accesibles, sin bundle bloat |
| Animaciones | Framer Motion 11 | GPU-accelerated |
| Estado global | Zustand | Simple, sin boilerplate |
| Estado servidor | TanStack Query v5 | Cache, revalidation |
| Formularios | React Hook Form + Zod | Validación |
| Gráficas | Recharts | Ligero, responsive |
| Fechas | date-fns | Tree-shakeable |
| HTTP | Axios | Interceptores auth JWT |

### Infraestructura
| Componente | Tecnología |
|-----------|-----------|
| Frontend | Vercel (deploy automático desde main) |
| Backend | Railway / Render / VPS propio |
| DB | PostgreSQL (Railway managed o Supabase) |
| Redis | Railway managed o Upstash |
| Contenedores local | Docker Compose (solo dev) |
| CI/CD | GitHub Actions |

---

## 📦 PLANES DEL PRODUCTO

### 🟢 Plan Básico — Agenda Automatizada ($29 USD/mes)
- Reservas vía WhatsApp
- Configuración de horarios y bloques de tiempo
- Confirmación automática inmediata
- Recordatorios: confirmación + 24h antes + 1h antes

### 🟡 Plan Medio — Recompra Inteligente ($59 USD/mes)
- Todo Plan Básico +
- Recordatorios personalizados por tipo de servicio
- Configuración de recurrencia por cliente
- Mensaje automático de recompra post-visita

### 🔵 Plan Premium — Fidelización + Retención ($99 USD/mes)
- Todo Plan Medio +
- Sistema de puntos y recompensas
- Segmentación de clientes y VIP
- Campañas automáticas ("Te extrañamos", "30 días sin visita")
- Métricas: tasa retorno, recurrencia, engagement, LTV

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌──────────────────────────────────────────────────────────┐
│                CLIENTE FINAL (usuario final)              │
│          WhatsApp Personal (no instala nada)              │
└─────────────────────────┬────────────────────────────────┘
                          │ Mensajes WhatsApp
┌─────────────────────────▼────────────────────────────────┐
│              META CLOUD API                               │
│   (usando credenciales del WhatsApp Business del tenant)  │
│   phone_number_id + access_token propios de cada empresa  │
└─────────────────────────┬────────────────────────────────┘
                          │ Webhooks → FastAPI
┌─────────────────────────▼────────────────────────────────┐
│                   BACKEND (FastAPI)                        │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐  │
│  │ Auth API │ │Booking   │ │Campaign   │ │ WhatsApp  │  │
│  │          │ │API       │ │API        │ │ Config    │  │
│  └──────────┘ └──────────┘ └───────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐                 │
│  │Client API│ │Webhook   │ │ Billing   │                 │
│  └──────────┘ └──────────┘ └───────────┘                 │
└──────────┬────────────────────────┬────────────────────-─┘
           │                        │
┌──────────▼──────┐      ┌──────────▼──────────┐
│   PostgreSQL    │      │       Redis           │
│  (multi-tenant) │      │  (cache + Celery)    │
│                 │      └──────────┬───────────┘
│  whatsapp_creds │                 │
│  cifradas/tenant│      ┌──────────▼──────────┐
└─────────────────┘      │   Celery Workers    │
                         │  • reminders        │
                         │  • campaigns        │
                         │  • metrics          │
                         └─────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js → Vercel)              │
│  Landing | Pricing | Auth | Dashboard | Onboarding WA    │
│  Agenda | Clientes | Campañas | Métricas                 │
└──────────────────────────────────────────────────────────┘
```

---

## 🗄️ MODELOS DE BASE DE DATOS (CORE)

### Multi-tenancy: via `tenant_id` en cada tabla
### RLS en PostgreSQL como segunda capa

### Entidades principales:
| Tabla | Descripción |
|-------|-------------|
| `tenants` | Empresas cliente del SaaS |
| `users` | Admins de cada tenant |
| `whatsapp_connections` | Credenciales WA cifradas por tenant |
| `customers` | Clientes finales de cada empresa |
| `services` | Servicios que ofrece cada empresa |
| `time_slots` | Bloques horarios configurados |
| `bookings` | Reservas |
| `reminders` | Cola de recordatorios programados |
| `message_templates` | Templates configurados por tenant/plan |
| `campaigns` | Campañas de recompra/fidelización |
| `points_transactions` | Sistema de puntos (premium) |
| `subscriptions` | Estado suscripción por tenant (PayPal / Mercado Pago / Webpay) |

### Tabla crítica — whatsapp_connections:
```sql
CREATE TABLE whatsapp_connections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    phone_number_id     TEXT NOT NULL,
    phone_number        TEXT NOT NULL,           -- "+56912345678"
    access_token_enc    BYTEA NOT NULL,          -- AES-256 cifrado
    is_active           BOOLEAN DEFAULT true,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)                            -- 1 conexión por tenant
);
```

---

## 💳 PAGOS — SUSCRIPCIONES RECURRENTES

**Proveedores oficiales:**
- **PayPal** — suscripciones recurrentes (Subscriptions API)
- **Mercado Pago** — suscripciones recurrentes (Preapproval API, Chile)
- **Webpay Plus (Transbank)** — pago con tarjeta chilena (SDK oficial)

- Suscripciones mensuales en CLP/USD por plan
- Trial: 14 días
- Webhooks/IPN de cada proveedor → actualizan estado en DB
- Portal de cliente para gestionar facturación
- Estados: `trial` → `active` → `canceled` → `past_due`

---

## 🎨 DISEÑO FRONTEND

Seguir `saas-frontend.md` para sistema visual completo.

### Paleta de Cliente Fiel:
```css
--primary: #6366f1;         /* indigo — tecnología, confianza */
--secondary: #10b981;       /* emerald — éxito, acción */
--accent-whatsapp: #25d366; /* verde WhatsApp — reconocimiento inmediato */
--accent-gold: #f59e0b;     /* amber — puntos, premium, recompensas */
```

---

## 📈 SEO — KEYWORDS OBJETIVO (Chile)

- cliente fiel whatsapp chile
- reservas por whatsapp para negocios chile
- recordatorios automáticos whatsapp
- fidelización de clientes whatsapp business
- sistema de reservas sin app chile
- agenda online para peluquería / spa / consultorio chile

---

## 🚀 PRIORIDAD MVP

1. ✅ Landing page + pricing (convierte)
2. ✅ Registro/Login + multi-tenant
3. ✅ Conexión WhatsApp Business (manual: phone_number_id + token)
4. ✅ Plan Básico: reservas + 3 recordatorios automáticos
5. ✅ Dashboard: agenda semanal + lista de clientes
6. ✅ Pago recurrente con PayPal / Mercado Pago / Webpay (Plan Básico)

**Post-MVP:**
- Plan Medio: mensajes de recompra
- Plan Premium: puntos, campañas, métricas
- v2 WhatsApp: OAuth Embedded Signup (conexión con 1 clic)

---

## 📁 ESTRUCTURA DE DIRECTORIOS

```
ClienteFiel/
├── backend/                          # FastAPI → Railway/Render/VPS
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py               # Login, registro, refresh
│   │   │   ├── bookings.py           # CRUD reservas
│   │   │   ├── clients.py            # Gestión clientes finales
│   │   │   ├── whatsapp.py           # Conectar/gestionar WA Business
│   │   │   ├── webhooks.py           # Webhook Meta + PayPal + Mercado Pago + Webpay
│   │   │   ├── campaigns.py          # Campañas automáticas
│   │   │   └── subscriptions.py      # Planes y facturación
│   │   ├── core/
│   │   │   ├── config.py             # Settings (env vars)
│   │   │   ├── security.py           # JWT, bcrypt, cifrado AES
│   │   │   ├── database.py           # SQLAlchemy session
│   │   │   └── dependencies.py       # FastAPI Depends()
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/
│   │   │   ├── booking_service.py
│   │   │   ├── whatsapp_service.py   # Envío mensajes Meta API
│   │   │   ├── reminder_service.py
│   │   │   └── campaign_service.py
│   │   ├── tasks/
│   │   │   ├── reminders.py          # Celery: recordatorios
│   │   │   ├── campaigns.py          # Celery: campañas
│   │   │   └── metrics.py            # Celery: cálculo métricas
│   │   └── main.py
│   ├── alembic/
│   │   └── versions/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                         # Next.js → Vercel
│   ├── app/
│   │   ├── (marketing)/              # Landing, pricing, blog
│   │   ├── (auth)/                   # Login, registro
│   │   ├── (dashboard)/
│   │   │   ├── agenda/
│   │   │   ├── clientes/
│   │   │   ├── campanas/
│   │   │   └── metricas/
│   │   └── onboarding/               # Conectar WhatsApp Business
│   ├── components/
│   │   ├── ui/                       # shadcn/ui
│   │   ├── sections/                 # Hero, Features, Pricing
│   │   └── dashboard/
│   ├── lib/
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   └── .env.example
│
├── CLAUDE.md
├── Avance.md
├── saas-frontend.md
└── skill-seo.md
```

---

## 📅 HISTORIAL DE CAMBIOS

### 2026-03-30
- **Corrección arquitectónica crítica:** Eliminado modelo BSP — ahora cada cliente conecta su propio WhatsApp Business
- Rebranding completo: todo a **Cliente Fiel**
- Mercado definido: solo Chile, pricing en USD
- Estructura de carpetas creada: `backend/` (Railway/Render) + `frontend/` (Vercel)
- Credenciales WhatsApp por tenant: cifradas AES-256 en DB
- Modelo de conexión MVP: manual (phone_number_id + token)
- v2 planificado: OAuth Meta Embedded Signup

### 2026-03-27
- JWT, rate limiting, bcrypt configurados

### 2026-03-25-26
- Arquitectura inicial, Docker, ESLint
