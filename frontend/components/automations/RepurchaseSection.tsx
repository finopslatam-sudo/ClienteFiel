'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface AutomationSettings {
  id: string
  repurchase_enabled: boolean
  repurchase_days_after: number
  repurchase_message: string | null
  points_enabled: boolean
  points_per_visit: number
  points_redeem_threshold: number
  points_reward_description: string | null
}

const VARIABLES = '{nombre}, {servicio}, {negocio}'
const EXAMPLE = 'Ej: Hola {nombre}, fue un placer atenderte. ¿Listo para tu próxima cita en {negocio}? Agenda ahora con un toque.'

export function RepurchaseSection({ plan }: { plan: string }) {
  const queryClient = useQueryClient()
  const isLocked = plan !== 'premium'

  const { data: settings } = useQuery<AutomationSettings>({
    queryKey: ['automation-settings'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/automations/settings')
      return data
    },
  })

  const [enabled, setEnabled] = useState(false)
  const [daysAfter, setDaysAfter] = useState(30)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setEnabled(settings.repurchase_enabled)
      setDaysAfter(settings.repurchase_days_after)
      setMessage(settings.repurchase_message ?? '')
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/api/v1/automations/settings', {
        repurchase_enabled: enabled,
        repurchase_days_after: daysAfter,
        repurchase_message: message || null,
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
      style={{ border: '1px solid rgba(6,182,212,0.12)', position: 'relative' }}
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
          <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Recompra automática post-visita</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Mensaje automático X días después de cada visita
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
            style={{ background: enabled ? '#06b6d4' : 'rgba(100,116,139,0.3)' }}
          >
            <div
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
            Días después de la visita
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={daysAfter}
            onChange={e => setDaysAfter(parseInt(e.target.value) || 30)}
            disabled={isLocked}
            className="input-dark w-32 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
            Mensaje de recompra
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={isLocked}
            rows={3}
            className="input-dark w-full px-3 py-2 text-sm resize-none"
            placeholder={EXAMPLE}
          />
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            Variables: <span style={{ color: '#06b6d4' }}>{VARIABLES}</span>
          </p>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={isLocked || saveMutation.isPending}
          className="px-4 py-2 rounded-lg text-sm font-semibold btn-cyan disabled:opacity-50"
        >
          {saved ? '✓ Guardado' : saveMutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
