// frontend/app/(dashboard)/suscripcion/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { DocumentPreferenceModal } from '@/components/billing/DocumentPreferenceModal'

interface SubscriptionStatus {
  plan: string
  status: string
  provider: string
  external_subscription_id: string | null
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
    priceCLP: '$20.000',
    priceUSD: 'USD 22',
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

  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      setShowModal(true)
    }
  }, [searchParams])

  const handleModalClose = () => {
    setShowModal(false)
    router.replace('/suscripcion')
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
          className="glass-card p-5 mb-8 flex items-center justify-between"
          style={{ border: '1px solid rgba(6,182,212,0.15)' }}
        >
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs mb-1" style={{ color: '#64748b' }}>Plan actual</div>
              <div className="font-semibold" style={{ color: '#f1f5f9' }}>
                {PLAN_LABELS[subscription.plan] ?? subscription.plan}
              </div>
            </div>
            <div
              className="w-px h-8"
              style={{ background: 'rgba(6,182,212,0.15)' }}
            />
            <div>
              <div className="text-xs mb-1" style={{ color: '#64748b' }}>Estado</div>
              <div className="font-semibold text-sm" style={{ color: statusInfo?.color ?? '#94a3b8' }}>
                {statusInfo?.label ?? subscription.status}
              </div>
            </div>
            {subscription.provider !== 'none' && (
              <>
                <div className="w-px h-8" style={{ background: 'rgba(6,182,212,0.15)' }} />
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
          return (
            <div
              key={plan.key}
              className="glass-card p-6 flex flex-col"
              style={
                plan.highlighted
                  ? { border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 0 30px rgba(6,182,212,0.08)' }
                  : undefined
              }
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
                  {subscribing === plan.key ? 'Redirigiendo...' : `Suscribirse con Mercado Pago`}
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
