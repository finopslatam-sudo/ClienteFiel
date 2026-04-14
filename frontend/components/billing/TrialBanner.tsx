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
        // Banner es opcional — silenciar error
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
