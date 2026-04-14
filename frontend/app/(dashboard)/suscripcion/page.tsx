// frontend/app/(dashboard)/suscripcion/page.tsx
'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
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
    accentColor: '#06b6d4',
    features: [
      { text: 'Reservas vía WhatsApp', included: true },
      { text: 'Configuración de horarios', included: true },
      { text: 'Confirmación automática inmediata', included: true },
      { text: 'Recordatorios: confirmación + 24h + 1h', included: true },
      { text: 'Recordatorios personalizados por servicio', included: false },
      { text: 'Recompra automática post-visita', included: false },
      { text: 'Sistema de puntos y recompensas', included: false },
      { text: 'Campañas automáticas de retención', included: false },
      { text: 'Métricas: retorno, recurrencia, LTV', included: false },
    ],
  },
  {
    key: 'medium',
    name: 'Medio',
    priceCLP: '$40.000',
    priceUSD: 'USD 42',
    subtitle: 'Recompra Inteligente',
    accentColor: '#06b6d4',
    features: [
      { text: 'Reservas vía WhatsApp', included: true },
      { text: 'Configuración de horarios', included: true },
      { text: 'Confirmación automática inmediata', included: true },
      { text: 'Recordatorios: confirmación + 24h + 1h', included: true },
      { text: 'Recordatorios personalizados por servicio', included: true },
      { text: 'Recompra automática post-visita', included: true },
      { text: 'Sistema de puntos y recompensas', included: false },
      { text: 'Campañas automáticas de retención', included: false },
      { text: 'Métricas: retorno, recurrencia, LTV', included: false },
    ],
    highlighted: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    priceCLP: '$60.000',
    priceUSD: 'USD 62',
    subtitle: 'Fidelización + Retención',
    accentColor: '#a78bfa',
    features: [
      { text: 'Reservas vía WhatsApp', included: true },
      { text: 'Configuración de horarios', included: true },
      { text: 'Confirmación automática inmediata', included: true },
      { text: 'Recordatorios: confirmación + 24h + 1h', included: true },
      { text: 'Recordatorios personalizados por servicio', included: true },
      { text: 'Recompra automática post-visita', included: true },
      { text: 'Sistema de puntos y recompensas', included: true },
      { text: 'Campañas automáticas de retención', included: true },
      { text: 'Métricas: retorno, recurrencia, LTV', included: true },
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

  // Resaltar plan pre-seleccionado desde URL
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam && plans.some(p => p.key === planParam)) {
      setHighlightedPlan(planParam)
      setTimeout(() => {
        planRefs.current[planParam]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
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
          const isPremium = plan.key === 'premium'
          const borderColor = isPremium ? plan.accentColor : '#06b6d4'
          return (
            <div
              key={plan.key}
              ref={el => { planRefs.current[plan.key] = el }}
              className="glass-card p-6 flex flex-col transition-all duration-300"
              style={{
                border: isHighlighted
                  ? `2px solid ${borderColor}`
                  : isPremium
                  ? `1px solid rgba(167,139,250,0.35)`
                  : plan.highlighted
                  ? '1px solid rgba(6,182,212,0.4)'
                  : '1px solid rgba(6,182,212,0.08)',
                boxShadow: isHighlighted
                  ? `0 0 0 2px ${borderColor}, 0 0 30px ${borderColor}33`
                  : isPremium
                  ? '0 0 30px rgba(167,139,250,0.08)'
                  : plan.highlighted
                  ? '0 0 30px rgba(6,182,212,0.08)'
                  : 'none',
              }}
            >
              {isPremium && (
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                >
                  COMPLETO
                </span>
              )}
              {plan.highlighted && !isPremium && (
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start"
                  style={{ background: '#06b6d4', color: '#020b14' }}
                >
                  MÁS POPULAR
                </span>
              )}
              <div className="text-3xl font-bold" style={{ color: isPremium ? '#a78bfa' : '#f1f5f9' }}>
                {plan.priceCLP}
                <span className="text-sm font-normal" style={{ color: '#94a3b8' }}> CLP/mes</span>
              </div>
              <div className="text-xs mt-0.5 mb-1" style={{ color: '#64748b' }}>{plan.priceUSD}/mes</div>
              <div className="font-semibold mb-1" style={{ color: '#f1f5f9' }}>{plan.name}</div>
              <div className="text-sm mb-5" style={{ color: '#94a3b8' }}>{plan.subtitle}</div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm" style={{ color: f.included ? '#94a3b8' : '#334155' }}>
                    <span style={{ color: f.included ? (isPremium ? '#a78bfa' : '#10b981') : '#334155', marginTop: '2px', flexShrink: 0 }}>
                      {f.included ? '✓' : '✕'}
                    </span>
                    {f.text}
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
                    isPremium ? '' : plan.highlighted ? 'btn-cyan' : 'btn-ghost-cyan'
                  }`}
                  style={isPremium ? {
                    background: 'rgba(167,139,250,0.15)',
                    border: '1px solid rgba(167,139,250,0.4)',
                    color: '#a78bfa',
                  } : undefined}
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
