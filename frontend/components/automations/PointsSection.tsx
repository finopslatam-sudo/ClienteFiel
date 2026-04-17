'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ContactSelector, type CustomerOption } from './ContactSelector'

interface AutomationSettings {
  points_enabled: boolean
  points_per_visit: number
  points_redeem_threshold: number
  points_reward_description: string | null
  points_customer_ids: string[]
}

export function PointsSection({ plan }: { plan: string }) {
  const queryClient = useQueryClient()
  const isLocked = plan !== 'premium'

  const { data: settings } = useQuery<AutomationSettings>({
    queryKey: ['automation-settings'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/automations/settings')
      return data
    },
  })

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ['customers-simple'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/customers?limit=200&order_by=name&order_dir=asc')
      return data.customers as CustomerOption[]
    },
    enabled: !isLocked,
  })

  const [enabled, setEnabled] = useState(false)
  const [pointsPerVisit, setPointsPerVisit] = useState(10)
  const [redeemThreshold, setRedeemThreshold] = useState(100)
  const [rewardDescription, setRewardDescription] = useState('')
  const [customerIds, setCustomerIds] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setEnabled(settings.points_enabled)
      setPointsPerVisit(settings.points_per_visit)
      setRedeemThreshold(settings.points_redeem_threshold)
      setRewardDescription(settings.points_reward_description ?? '')
      setCustomerIds(settings.points_customer_ids ?? [])
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/api/v1/automations/settings', {
        points_enabled: enabled,
        points_per_visit: pointsPerVisit,
        points_redeem_threshold: redeemThreshold,
        points_reward_description: rewardDescription || null,
        points_customer_ids: customerIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div
      className="glass-card p-6"
      style={{ border: '1px solid rgba(167,139,250,0.15)', position: 'relative' }}
    >
      {isLocked && (
        <div
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: 'rgba(2,11,20,0.85)', backdropFilter: 'blur(2px)' }}
        >
          <span className="text-2xl">🔒</span>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Requiere Plan Premium</p>
          <a
            href="/suscripcion"
            className="text-xs px-4 py-2 rounded-lg font-semibold"
            style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            Actualizar plan
          </a>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Sistema de puntos y recompensas</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Acumula puntos por visita y canjea recompensas
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            disabled={isLocked}
            className="sr-only peer"
          />
          <div
            className="w-11 h-6 rounded-full transition-colors relative"
            style={{ background: enabled ? '#a78bfa' : 'rgba(100,116,139,0.3)' }}
          >
            <div
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
              Puntos por visita
            </label>
            <input
              type="number"
              min={1}
              value={pointsPerVisit}
              onChange={e => setPointsPerVisit(parseInt(e.target.value) || 10)}
              disabled={isLocked}
              className="input-dark w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
              Puntos para canjear
            </label>
            <input
              type="number"
              min={1}
              value={redeemThreshold}
              onChange={e => setRedeemThreshold(parseInt(e.target.value) || 100)}
              disabled={isLocked}
              className="input-dark w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
            Descripción de la recompensa
          </label>
          <input
            type="text"
            value={rewardDescription}
            onChange={e => setRewardDescription(e.target.value)}
            disabled={isLocked}
            placeholder="Ej: Descuento de 10% en tu próxima visita"
            className="input-dark w-full px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Aplicar a</label>
          <ContactSelector
            value={customerIds}
            onChange={setCustomerIds}
            customers={customers}
            accentColor="#a78bfa"
          />
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={isLocked || saveMutation.isPending}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
        >
          {saved ? '✓ Guardado' : saveMutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
