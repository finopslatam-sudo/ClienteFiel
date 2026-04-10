'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface SubscriptionStatus {
  plan: string
  status: string
  trial_ends_at: string | null
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Básico',
  medium: 'Medio',
  premium: 'Premium',
}

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt + 'Z')
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function PlanStatusBadge() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    api.get<SubscriptionStatus>('/api/v1/billing/subscription')
      .then(({ data }) => setStatus(data))
      .catch(() => {})
  }, [])

  if (!status) return null

  if (status.status === 'trial') {
    const days = status.trial_ends_at ? getDaysRemaining(status.trial_ends_at) : 0
    return (
      <Link href="/suscripcion">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Prueba gratuita · {days} {days === 1 ? 'día' : 'días'} restantes
        </span>
      </Link>
    )
  }

  if (status.status === 'active') {
    return (
      <Link href="/suscripcion">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Plan {PLAN_LABELS[status.plan] ?? status.plan} · Activo
        </span>
      </Link>
    )
  }

  if (status.status === 'past_due') {
    return (
      <Link href="/suscripcion">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Pago pendiente
        </span>
      </Link>
    )
  }

  return null
}
