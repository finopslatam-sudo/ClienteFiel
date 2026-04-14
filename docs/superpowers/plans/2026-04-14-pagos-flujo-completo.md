# Pagos — Flujo Completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el flujo end-to-end desde que el usuario selecciona un plan en la landing hasta que activa su suscripción, mostrar la fecha de fin de trial, y agregar un banner de activación en el dashboard.

**Architecture:** Solo cambios de frontend. Se usa `localStorage` para persistir el plan seleccionado entre páginas (registro → onboarding → suscripcion). Se crea un componente `TrialBanner` que consulta `GET /api/v1/billing/subscription` independientemente y se muestra solo en estado `trial`. No se modifica ningún archivo de backend.

**Tech Stack:** Next.js 14 App Router, TypeScript, `localStorage` (browser API), `date-fns`, `@tanstack/react-query`, `@/lib/api` (axios wrapper existente).

---

## Archivos

- **Modify:** `frontend/app/(auth)/registro/page.tsx`
- **Modify:** `frontend/app/onboarding/page.tsx`
- **Modify:** `frontend/app/(dashboard)/suscripcion/page.tsx`
- **Create:** `frontend/components/billing/TrialBanner.tsx`
- **Modify:** `frontend/app/(dashboard)/dashboard/page.tsx`

---

### Task 1: Preservar plan en registro

**Files:**
- Modify: `frontend/app/(auth)/registro/page.tsx`

Al cargar `/registro?plan=basic`, guardar el plan en `localStorage('pending_plan')` para que sobreviva la navegación.

- [ ] **Step 1: Modificar RegisterPage para leer ?plan del URL**

Abrir `frontend/app/(auth)/registro/page.tsx`. Agregar el `useEffect` que guarda el plan en localStorage. El componente usa `useRouter` — agregar también `useSearchParams`.

Reemplazar el inicio del componente (desde las importaciones hasta el `onSubmit`):

```typescript
// frontend/app/(auth)/registro/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { register as registerUser } from '@/lib/auth'
import { fadeInUp } from '@/lib/motion'

const VALID_PLANS = ['basic', 'medium', 'premium'] as const

const schema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  business_name: z.string().min(2, 'Nombre del negocio requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan && (VALID_PLANS as readonly string[]).includes(plan)) {
      localStorage.setItem('pending_plan', plan)
    }
  }, [searchParams])

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await registerUser(data)
      router.push('/onboarding')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Error al crear la cuenta. Intenta nuevamente.')
    }
  }
```

El resto del JSX de `RegisterPage` no cambia. Mantener todo a partir del `return (`.

- [ ] **Step 2: Envolver RegisterPage en Suspense (requerido por useSearchParams)**

El componente que usa `useSearchParams` debe estar dentro de un `<Suspense>`. Convertir la página en dos componentes:

```typescript
// Al final del archivo, reemplazar:
// export default function RegisterPage() { ... }
// por:

function RegisterContent() {
  // ... todo el contenido actual de RegisterPage
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  )
}
```

Agregar `import { Suspense } from 'react'` al inicio.

- [ ] **Step 3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(auth)/registro/page.tsx
git commit -m "feat(pagos): preserve selected plan in localStorage during registration"
```

---

### Task 2: Redirigir con plan al completar onboarding

**Files:**
- Modify: `frontend/app/onboarding/page.tsx`

Al salir del onboarding (por cualquier camino — "Omitir" o "Ir al dashboard"), verificar si hay un `pending_plan` en localStorage y redirigir a `/suscripcion?plan=<valor>` en lugar de `/agenda`.

- [ ] **Step 1: Crear helper getRedirectAfterOnboarding**

```typescript
// Agregar esta función al inicio del componente (antes del return)
function getRedirectAfterOnboarding(): string {
  const pendingPlan = localStorage.getItem('pending_plan')
  if (pendingPlan) {
    localStorage.removeItem('pending_plan')
    return `/suscripcion?plan=${pendingPlan}`
  }
  return '/agenda'
}
```

- [ ] **Step 2: Reemplazar onboarding/page.tsx completo**

```typescript
// frontend/app/onboarding/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmbeddedSignupButton } from '@/components/whatsapp/EmbeddedSignupButton'

const steps = ['Bienvenida', 'Conectar WhatsApp', 'Listo']

function getRedirectAfterOnboarding(): string {
  const pendingPlan = localStorage.getItem('pending_plan')
  if (pendingPlan) {
    localStorage.removeItem('pending_plan')
    return `/suscripcion?plan=${pendingPlan}`
  }
  return '/agenda'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [connectedPhone, setConnectedPhone] = useState('')
  const [error, setError] = useState('')

  const handleSuccess = (phone: string) => {
    setConnectedPhone(phone)
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-12 ${i < step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Bienvenida */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">¡Bienvenido a Cliente Fiel!</h1>
            <p className="text-slate-600 mb-2">
              Para empezar, necesitas conectar tu <strong>WhatsApp Business</strong>.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Necesitas un número de WhatsApp Business activo. Si no tienes uno, puedes crearlo
              gratuitamente en{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                Meta Business Manager
              </a>.
            </p>
            <button
              onClick={() => setStep(1)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Step 1: Conectar WhatsApp */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Conecta tu WhatsApp Business</h2>
            <p className="text-slate-600 mb-6">
              Haz clic en el botón y autoriza el acceso a tu WhatsApp Business con tu cuenta de Meta.
              El proceso toma menos de 2 minutos.
            </p>
            <ol className="space-y-2 text-sm text-slate-600 mb-8">
              <li className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                Haz clic en &quot;Conectar con Meta&quot;
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                Inicia sesión con tu cuenta de Facebook/Meta
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                Selecciona tu número de WhatsApp Business y autoriza
              </li>
            </ol>

            <div className="flex justify-center mb-4">
              <EmbeddedSignupButton onSuccess={handleSuccess} onError={setError} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
                {error}
              </div>
            )}

            <button
              onClick={() => router.push(getRedirectAfterOnboarding())}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-4"
            >
              Omitir por ahora (puedes conectar después)
            </button>
          </div>
        )}

        {/* Step 2: Listo */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">¡WhatsApp conectado!</h2>
            <p className="text-slate-600 mb-2">
              Número conectado:{' '}
              <span className="font-semibold text-slate-900">{connectedPhone}</span>
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Tu WhatsApp Business está listo. Ahora puedes configurar tus servicios y empezar a
              recibir reservas.
            </p>
            <button
              onClick={() => router.push(getRedirectAfterOnboarding())}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Ir al dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/onboarding/page.tsx
git commit -m "feat(pagos): redirect to subscription page after onboarding if plan was pre-selected"
```

---

### Task 3: Mejorar página de suscripción (trial_ends_at + highlight de plan)

**Files:**
- Modify: `frontend/app/(dashboard)/suscripcion/page.tsx`

Dos cambios:
1. Mostrar `trial_ends_at` en el banner de estado
2. Si `?plan=medium` en URL, hacer scroll y resaltar ese plan con un anillo cyan por 2 segundos

- [ ] **Step 1: Reemplazar suscripcion/page.tsx completo**

```typescript
// frontend/app/(dashboard)/suscripcion/page.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '@/lib/api'
import { DocumentPreferenceModal } from '@/components/billing/DocumentPreferenceModal'

interface SubscriptionStatus {
  plan: string
  status: string
  provider: string
  external_subscription_id: string | null
  trial_ends_at: string | null
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Básico',
  medium: 'Medio',
  premium: 'Premium',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trial: { label: 'Prueba gratuita', color: '#f59e0b' },
  active: { label: 'Activo', color: '#10b981' },
  past_due: { label: 'Pago pendiente', color: '#ef4444' },
  canceled: { label: 'Cancelado', color: '#64748b' },
}

const plans = [
  {
    key: 'basic',
    name: 'Básico',
    priceCLP: '$3.000',
    priceUSD: 'USD 3',
    subtitle: 'Agenda Automatizada',
    features: [
      'Reservas vía WhatsApp',
      'Configuración de horarios',
      'Confirmación automática inmediata',
      'Recordatorios: confirmación + 24h + 1h',
    ],
  },
  {
    key: 'medium',
    name: 'Medio',
    priceCLP: '$40.000',
    priceUSD: 'USD 42',
    subtitle: 'Recompra Inteligente',
    features: [
      'Todo el Plan Básico',
      'Recordatorios personalizados por servicio',
      'Configuración de recurrencia por cliente',
      'Mensaje automático de recompra post-visita',
    ],
    highlighted: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    priceCLP: '$60.000',
    priceUSD: 'USD 62',
    subtitle: 'Fidelización + Retención',
    features: [
      'Todo el Plan Medio',
      'Sistema de puntos y recompensas',
      'Segmentación de clientes y VIP',
      'Campañas automáticas ("Te extrañamos")',
      'Métricas: retorno, recurrencia, LTV',
    ],
  },
]

function SuscripcionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null)
  const planRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      setShowModal(true)
    }
  }, [searchParams])

  // Highlight plan pre-seleccionado desde URL
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam && plans.some(p => p.key === planParam)) {
      setHighlightedPlan(planParam)
      setTimeout(() => {
        planRefs.current[planParam]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      // Quitar resaltado después de 2 segundos
      const timer = setTimeout(() => setHighlightedPlan(null), 2200)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleModalClose = () => {
    setShowModal(false)
    if (searchParams.get('subscribed') === 'true') {
      router.replace('/suscripcion')
    }
  }

  useEffect(() => {
    api.get<SubscriptionStatus>('/api/v1/billing/subscription')
      .then(({ data }) => setSubscription(data))
      .catch(() => setError('No se pudo cargar el estado de suscripción.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (planKey: string) => {
    setSubscribing(planKey)
    setError('')
    try {
      const backUrl = `${window.location.origin}/suscripcion?subscribed=true`
      const { data } = await api.post<{ checkout_url: string }>('/api/v1/billing/subscribe', {
        plan: planKey,
        back_url: backUrl,
      })
      window.location.href = data.checkout_url
    } catch {
      setError('Error al iniciar el pago. Intenta nuevamente.')
      setSubscribing(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Confirmas que quieres cancelar tu suscripción?')) return
    setCanceling(true)
    setError('')
    try {
      await api.post('/api/v1/billing/cancel')
      const { data } = await api.get<SubscriptionStatus>('/api/v1/billing/subscription')
      setSubscription(data)
    } catch {
      setError('Error al cancelar. Contacta a soporte.')
    } finally {
      setCanceling(false)
    }
  }

  const statusInfo = subscription ? STATUS_LABELS[subscription.status] : null
  const isActive = subscription?.status === 'active'

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
        Suscripción
      </h1>
      <p className="text-sm mb-8" style={{ color: '#64748b' }}>
        Gestiona tu plan y medio de pago
      </p>

      {/* Estado actual */}
      {!loading && subscription && (
        <div
          className="glass-card p-5 mb-8"
          style={{ border: '1px solid rgba(6,182,212,0.15)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-xs mb-1" style={{ color: '#64748b' }}>Plan actual</div>
                <div className="font-semibold" style={{ color: '#f1f5f9' }}>
                  {PLAN_LABELS[subscription.plan] ?? subscription.plan}
                </div>
              </div>
              <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(6,182,212,0.15)' }} />
              <div>
                <div className="text-xs mb-1" style={{ color: '#64748b' }}>Estado</div>
                <div className="font-semibold text-sm" style={{ color: statusInfo?.color ?? '#94a3b8' }}>
                  {statusInfo?.label ?? subscription.status}
                </div>
              </div>
              {subscription.status === 'trial' && subscription.trial_ends_at && (
                <>
                  <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(6,182,212,0.15)' }} />
                  <div>
                    <div className="text-xs mb-1" style={{ color: '#64748b' }}>Tu prueba gratis termina</div>
                    <div className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                      {format(parseISO(subscription.trial_ends_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </div>
                  </div>
                </>
              )}
              {subscription.provider !== 'none' && (
                <>
                  <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(6,182,212,0.15)' }} />
                  <div>
                    <div className="text-xs mb-1" style={{ color: '#64748b' }}>Proveedor</div>
                    <div className="text-sm capitalize" style={{ color: '#94a3b8' }}>
                      {subscription.provider === 'mercadopago' ? 'Mercado Pago' : subscription.provider}
                    </div>
                  </div>
                </>
              )}
            </div>
            {isActive && (
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {canceling ? 'Cancelando...' : 'Cancelar suscripción'}
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Planes */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.key && isActive
          const isHighlighted = highlightedPlan === plan.key
          return (
            <div
              key={plan.key}
              ref={el => { planRefs.current[plan.key] = el }}
              className="glass-card p-6 flex flex-col transition-all duration-300"
              style={{
                border: isHighlighted
                  ? '2px solid #06b6d4'
                  : plan.highlighted
                  ? '1px solid rgba(6,182,212,0.4)'
                  : '1px solid rgba(6,182,212,0.08)',
                boxShadow: isHighlighted
                  ? '0 0 0 2px #06b6d4, 0 0 30px rgba(6,182,212,0.2)'
                  : plan.highlighted
                  ? '0 0 30px rgba(6,182,212,0.08)'
                  : 'none',
              }}
            >
              {plan.highlighted && (
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start"
                  style={{ background: '#06b6d4', color: '#020b14' }}
                >
                  MÁS POPULAR
                </span>
              )}
              <div className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
                {plan.priceCLP}
                <span className="text-sm font-normal" style={{ color: '#94a3b8' }}> CLP/mes</span>
              </div>
              <div className="text-xs mt-0.5 mb-1" style={{ color: '#64748b' }}>{plan.priceUSD}/mes</div>
              <div className="font-semibold mb-1" style={{ color: '#f1f5f9' }}>{plan.name}</div>
              <div className="text-sm mb-5" style={{ color: '#94a3b8' }}>{plan.subtitle}</div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#94a3b8' }}>
                    <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div
                  className="text-center py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                >
                  Plan actual
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={!!subscribing}
                  className={`py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                    plan.highlighted ? 'btn-cyan' : 'btn-ghost-cyan'
                  }`}
                >
                  {subscribing === plan.key ? 'Redirigiendo...' : 'Suscribirse con Mercado Pago'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-6 text-center" style={{ color: '#475569' }}>
        Pago recurrente mensual · Cancela cuando quieras · Sin contratos
      </p>

      {showModal && <DocumentPreferenceModal onClose={handleModalClose} />}
    </div>
  )
}

export default function SuscripcionPage() {
  return (
    <Suspense>
      <SuscripcionContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(dashboard)/suscripcion/page.tsx
git commit -m "feat(pagos): show trial end date and highlight pre-selected plan in subscription page"
```

---

### Task 4: Crear TrialBanner y agregarlo al dashboard

**Files:**
- Create: `frontend/components/billing/TrialBanner.tsx`
- Modify: `frontend/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Crear TrialBanner.tsx**

```typescript
// frontend/components/billing/TrialBanner.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '@/lib/api'

interface SubscriptionStatus {
  status: string
  trial_ends_at: string | null
}

export function TrialBanner() {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    api.get<SubscriptionStatus>('/api/v1/billing/subscription')
      .then(({ data }) => setSub(data))
      .catch(() => {
        // Silenciar error — el banner es opcional
      })
  }, [])

  if (!sub || sub.status !== 'trial' || dismissed) return null

  const trialEndText = sub.trial_ends_at
    ? `Tu prueba gratis termina el ${format(parseISO(sub.trial_ends_at), "d 'de' MMMM 'de' yyyy", { locale: es })}`
    : 'Estás en período de prueba gratis'

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl mb-6 gap-3"
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">⏳</span>
        <span className="text-sm truncate" style={{ color: '#f59e0b' }}>
          {trialEndText}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/suscripcion"
          className="text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-80"
          style={{ color: '#06b6d4' }}
        >
          Activar plan →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-xl leading-none transition-opacity hover:opacity-60"
          style={{ color: '#475569' }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Agregar TrialBanner al dashboard**

Abrir `frontend/app/(dashboard)/dashboard/page.tsx`. Agregar el import y el componente al inicio del `return`:

Agregar al bloque de imports (línea 1 del archivo, justo después de los imports existentes):

```typescript
import { TrialBanner } from '@/components/billing/TrialBanner'
```

En el `return` de `DashboardPage`, agregar `<TrialBanner />` como primer elemento dentro del `<div>`:

```typescript
export default function DashboardPage() {
  // ... (queries sin cambios)

  return (
    <div>
      <TrialBanner />

      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#475569' }}>
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* ... resto sin cambios */}
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos y lint**

```bash
cd frontend && npx tsc --noEmit && npx next lint
```

Resultado esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/billing/TrialBanner.tsx frontend/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(pagos): add trial activation banner to dashboard"
```

---

### Task 5: Verificación final

- [ ] **Step 1: Build de producción**

```bash
cd frontend && npx next build
```

Resultado esperado: `✓ Compiled successfully`, sin errores.

- [ ] **Step 2: Commit final**

```bash
git add -A
git commit -m "feat(pagos): complete subscription flow - plan preservation, trial banner, and UX improvements"
```
