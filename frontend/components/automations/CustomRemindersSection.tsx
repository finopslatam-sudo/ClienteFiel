// frontend/components/automations/CustomRemindersSection.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface CustomReminder {
  id: string
  service_id: string | null
  message_text: string
  days_before: number
  send_time: string
  active: boolean
  created_at: string
  customer_ids: string[]
}

interface ReminderForm {
  message_text: string
  days_before: number
  send_time: string
  service_id: string
  active: boolean
  customer_ids: string[]
}

interface CustomerOption {
  id: string
  name: string | null
  phone_number: string
}

const AVAILABLE_VARIABLES = '{nombre}, {servicio}, {negocio}, {fecha}'
const EXAMPLE = 'Ej: Hola {nombre}, te recordamos tu cita de {servicio} en {negocio} el {fecha}. ¡Te esperamos!'

export function CustomRemindersSection({ plan }: { plan: string }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ReminderForm>({
    message_text: '',
    days_before: 1,
    send_time: '09:00',
    service_id: '',
    active: true,
    customer_ids: [],
  })
  const [formError, setFormError] = useState('')
  const [showContactsDropdown, setShowContactsDropdown] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isLocked = plan === 'basic'

  const { data: reminders = [], isLoading } = useQuery<CustomReminder[]>({
    queryKey: ['automations-reminders'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/automations/reminders')
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowContactsDropdown(false)
      }
    }
    if (showContactsDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showContactsDropdown])

  const saveMutation = useMutation({
    mutationFn: async (data: ReminderForm) => {
      const payload = {
        message_text: data.message_text,
        days_before: data.days_before,
        send_time: data.send_time,
        service_id: data.service_id || null,
        active: data.active,
        customer_ids: data.customer_ids,
      }
      if (editingId) {
        return api.put(`/api/v1/automations/reminders/${editingId}`, payload)
      }
      return api.post('/api/v1/automations/reminders', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations-reminders'] })
      setShowModal(false)
      resetForm()
    },
    onError: () => setFormError('Error al guardar. Intenta nuevamente.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/automations/reminders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations-reminders'] }),
  })

  const resetForm = () => {
    setForm({ message_text: '', days_before: 1, send_time: '09:00', service_id: '', active: true, customer_ids: [] })
    setEditingId(null)
    setFormError('')
    setContactSearch('')
    setShowContactsDropdown(false)
  }

  const openEdit = (r: CustomReminder) => {
    setForm({
      message_text: r.message_text,
      days_before: r.days_before,
      send_time: r.send_time ?? '09:00',
      service_id: r.service_id ?? '',
      active: r.active,
      customer_ids: r.customer_ids ?? [],
    })
    setEditingId(r.id)
    setShowModal(true)
  }

  const toggleCustomer = (id: string) => {
    setForm(f => ({
      ...f,
      customer_ids: f.customer_ids.includes(id)
        ? f.customer_ids.filter(c => c !== id)
        : [...f.customer_ids, id],
    }))
  }

  const filteredCustomers = customers.filter(c => {
    const q = contactSearch.toLowerCase()
    return (c.name ?? '').toLowerCase().includes(q) || c.phone_number.includes(q)
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
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Requiere Plan Medio</p>
          <a
            href="/suscripcion"
            className="text-xs px-4 py-2 rounded-lg font-semibold"
            style={{ background: '#06b6d4', color: '#020b14' }}
          >
            Actualizar plan
          </a>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Recordatorios personalizados</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Mensajes automáticos antes de cada cita
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          disabled={isLocked}
          className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
        >
          + Agregar
        </button>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-lg" style={{ background: 'rgba(15,23,42,0.4)' }} />
      ) : reminders.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: '#475569' }}>
          Sin recordatorios configurados
        </p>
      ) : (
        <div className="space-y-2">
          {reminders.map(r => (
            <div
              key={r.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg gap-4"
              style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(6,182,212,0.06)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate" style={{ color: '#e2e8f0' }}>
                  {r.message_text.substring(0, 80)}{r.message_text.length > 80 ? '…' : ''}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                  {r.days_before} día{r.days_before !== 1 ? 's' : ''} antes · {r.send_time}
                  {r.customer_ids.length > 0 ? ` · ${r.customer_ids.length} contacto${r.customer_ids.length !== 1 ? 's' : ''}` : ' · Todos'}
                  {' · '}{r.active ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(r)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar este recordatorio?')) deleteMutation.mutate(r.id)
                  }}
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
          <div className="glass-card p-6 w-full max-w-md" style={{ border: '1px solid rgba(6,182,212,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#f1f5f9' }}>
              {editingId ? 'Editar recordatorio' : 'Nuevo recordatorio'}
            </h3>

            <div className="space-y-4">
              {/* Anticipación */}
              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
                  Anticipación
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={form.days_before}
                      onChange={e => setForm(f => ({ ...f, days_before: parseInt(e.target.value) || 1 }))}
                      className="input-dark w-20 px-3 py-2 text-sm text-center"
                    />
                    <span className="text-sm" style={{ color: '#64748b' }}>
                      día{form.days_before !== 1 ? 's' : ''} antes · a las
                    </span>
                  </div>
                  <input
                    type="time"
                    value={form.send_time}
                    onChange={e => setForm(f => ({ ...f, send_time: e.target.value }))}
                    className="input-dark px-3 py-2 text-sm"
                    style={{ colorScheme: 'dark', minWidth: '110px' }}
                  />
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
                  Mensaje
                </label>
                <textarea
                  value={form.message_text}
                  onChange={e => setForm(f => ({ ...f, message_text: e.target.value }))}
                  rows={4}
                  className="input-dark w-full px-3 py-2 text-sm resize-none"
                  placeholder={EXAMPLE}
                />
                <p className="text-xs mt-1" style={{ color: '#475569' }}>
                  Variables disponibles: <span style={{ color: '#06b6d4' }}>{AVAILABLE_VARIABLES}</span>
                </p>
              </div>

              {/* Contactos */}
              <div>
                <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
                  Enviar a
                </label>
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowContactsDropdown(v => !v)}
                    className="input-dark w-full px-3 py-2 text-sm text-left flex justify-between items-center"
                  >
                    <span style={{ color: form.customer_ids.length ? '#e2e8f0' : '#475569' }}>
                      {form.customer_ids.length === 0
                        ? 'Todos los clientes'
                        : `${form.customer_ids.length} contacto${form.customer_ids.length !== 1 ? 's' : ''} seleccionado${form.customer_ids.length !== 1 ? 's' : ''}`}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>▾</span>
                  </button>

                  {showContactsDropdown && (
                    <div
                      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg overflow-hidden"
                      style={{
                        background: '#0a1628',
                        border: '1px solid rgba(6,182,212,0.2)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                    >
                      <div className="p-2 sticky top-0" style={{ background: '#0a1628', borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                        <input
                          type="text"
                          placeholder="Buscar por nombre o teléfono..."
                          value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                          className="input-dark w-full px-2 py-1.5 text-xs"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, customer_ids: [] })); setShowContactsDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                        style={{
                          color: form.customer_ids.length === 0 ? '#06b6d4' : '#94a3b8',
                          background: form.customer_ids.length === 0 ? 'rgba(6,182,212,0.08)' : 'transparent',
                        }}
                      >
                        <span style={{ width: '14px', textAlign: 'center' }}>
                          {form.customer_ids.length === 0 ? '✓' : ''}
                        </span>
                        <span>Todos los clientes</span>
                      </button>

                      {filteredCustomers.map(c => {
                        const selected = form.customer_ids.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCustomer(c.id)}
                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                            style={{
                              color: selected ? '#06b6d4' : '#94a3b8',
                              background: selected ? 'rgba(6,182,212,0.08)' : 'transparent',
                            }}
                          >
                            <span style={{ width: '14px', textAlign: 'center', fontSize: '12px' }}>
                              {selected ? '✓' : ''}
                            </span>
                            <span className="flex-1 truncate">{c.name || c.phone_number}</span>
                            {c.name && (
                              <span className="text-xs flex-shrink-0" style={{ color: '#475569' }}>
                                {c.phone_number}
                              </span>
                            )}
                          </button>
                        )
                      })}

                      {filteredCustomers.length === 0 && contactSearch && (
                        <p className="text-xs text-center py-3" style={{ color: '#475569' }}>
                          Sin resultados
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reminder-active"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                />
                <label htmlFor="reminder-active" className="text-sm" style={{ color: '#94a3b8' }}>Activo</label>
              </div>

              {formError && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{formError}</p>
              )}
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
                disabled={saveMutation.isPending || !form.message_text.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold btn-cyan disabled:opacity-50"
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
