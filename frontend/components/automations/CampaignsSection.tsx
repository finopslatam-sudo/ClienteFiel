'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '@/lib/api'
import { ContactSelector, type CustomerOption } from './ContactSelector'

interface Campaign {
  id: string
  name: string
  message_text: string
  trigger_type: string
  trigger_value: number
  active: boolean
  last_run_at: string | null
  created_at: string
  customer_ids: string[]
}

interface CampaignForm {
  name: string
  message_text: string
  trigger_value: number
  active: boolean
  customer_ids: string[]
}

const VARIABLES = '{nombre}, {negocio}'
const EXAMPLE = 'Ej: Hola {nombre}, ¡te extrañamos en {negocio}! Agenda tu próxima cita y obtén un regalo especial.'

export function CampaignsSection({ plan }: { plan: string }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    message_text: '',
    trigger_value: 30,
    active: false,
    customer_ids: [],
  })
  const [formError, setFormError] = useState('')

  const isLocked = plan !== 'premium'

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/automations/campaigns')
      return data
    },
    enabled: !isLocked,
  })

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ['customers-simple'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/customers?limit=200&order_by=name&order_dir=asc')
      return data.customers as CustomerOption[]
    },
    enabled: showModal,
  })

  const saveMutation = useMutation({
    mutationFn: (data: CampaignForm) => {
      const payload = { ...data, trigger_type: 'inactive_days' }
      if (editingId) return api.put(`/api/v1/automations/campaigns/${editingId}`, payload)
      return api.post('/api/v1/automations/campaigns', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setShowModal(false)
      resetForm()
    },
    onError: () => setFormError('Error al guardar. Intenta nuevamente.'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/automations/campaigns/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/automations/campaigns/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const resetForm = () => {
    setForm({ name: '', message_text: '', trigger_value: 30, active: false, customer_ids: [] })
    setEditingId(null)
    setFormError('')
  }

  const openEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      message_text: c.message_text,
      trigger_value: c.trigger_value,
      active: c.active,
      customer_ids: c.customer_ids ?? [],
    })
    setEditingId(c.id)
    setShowModal(true)
  }

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
          <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Campañas automáticas de retención</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Mensajes automáticos para clientes inactivos
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          disabled={isLocked}
          className="text-sm px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
        >
          + Nueva campaña
        </button>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-lg" style={{ background: 'rgba(15,23,42,0.4)' }} />
      ) : campaigns.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: '#475569' }}>Sin campañas configuradas</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg gap-4"
              style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(167,139,250,0.08)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: c.active ? '#10b981' : '#475569' }}
                  />
                  <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{c.name}</p>
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                  {c.trigger_value} días inactivo
                  {c.customer_ids?.length > 0 ? ` · ${c.customer_ids.length} contacto${c.customer_ids.length !== 1 ? 's' : ''}` : ' · Todos'}
                  {c.last_run_at
                    ? ` · Última ejecución: ${format(new Date(c.last_run_at), "d MMM", { locale: es })}`
                    : ' · Sin ejecuciones'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleMutation.mutate(c.id)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: c.active ? '#10b981' : '#64748b', border: `1px solid ${c.active ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}` }}
                >
                  {c.active ? 'Pausar' : 'Activar'}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => { if (confirm('¿Eliminar esta campaña?')) deleteMutation.mutate(c.id) }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetForm() } }}
        >
          <div
            className="glass-card p-6 w-full max-w-md"
            style={{ border: '1px solid rgba(167,139,250,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 className="font-semibold mb-4" style={{ color: '#f1f5f9' }}>
              {editingId ? 'Editar campaña' : 'Nueva campaña'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Nombre de la campaña</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Te extrañamos"
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
                  Días sin visita para activar
                </label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={form.trigger_value}
                  onChange={e => setForm(f => ({ ...f, trigger_value: parseInt(e.target.value) || 30 }))}
                  className="input-dark w-32 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Mensaje</label>
                <textarea
                  value={form.message_text}
                  onChange={e => setForm(f => ({ ...f, message_text: e.target.value }))}
                  rows={4}
                  className="input-dark w-full px-3 py-2 text-sm resize-none"
                  placeholder={EXAMPLE}
                />
                <p className="text-xs mt-1" style={{ color: '#475569' }}>
                  Variables: <span style={{ color: '#a78bfa' }}>{VARIABLES}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Enviar a</label>
                <ContactSelector
                  value={form.customer_ids}
                  onChange={ids => setForm(f => ({ ...f, customer_ids: ids }))}
                  customers={customers}
                  accentColor="#a78bfa"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="campaign-active"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                />
                <label htmlFor="campaign-active" className="text-sm" style={{ color: '#94a3b8' }}>Activar campaña</label>
              </div>

              {formError && <p className="text-xs" style={{ color: '#ef4444' }}>{formError}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name.trim() || !form.message_text.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
              >
                {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
