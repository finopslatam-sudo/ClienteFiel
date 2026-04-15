// frontend/app/(dashboard)/automatizaciones/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { CustomRemindersSection } from '@/components/automations/CustomRemindersSection'
import { RepurchaseSection } from '@/components/automations/RepurchaseSection'
import { PointsSection } from '@/components/automations/PointsSection'
import { CampaignsSection } from '@/components/automations/CampaignsSection'
import { GiftCardSection } from '@/components/automations/GiftCardSection'

interface SubscriptionStatus {
  plan: string
  status: string
}

export default function AutomatizacionesPage() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionStatus>('/api/v1/billing/subscription')
      return data
    },
  })

  const plan = subscription?.plan ?? 'basic'

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
          Automatizaciones
        </h1>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Configura mensajes automáticos para retener y fidelizar clientes
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <CustomRemindersSection plan={plan} />
          <RepurchaseSection plan={plan} />
          <PointsSection plan={plan} />
          <CampaignsSection plan={plan} />
          <GiftCardSection plan={plan} />
        </>
      )}
    </div>
  )
}
