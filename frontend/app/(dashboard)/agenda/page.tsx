// frontend/app/(dashboard)/agenda/page.tsx
'use client'
import { useState } from 'react'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useBookings, useCancelBooking, useCompleteBooking, useCreateBooking } from '@/lib/hooks/useBookings'
import { useServices } from '@/lib/hooks/useServices'
import { formatWeekRange, nextWeek, prevWeek } from '@/lib/utils/dates'
import { staggerContainer, fadeInUp } from '@/lib/motion'
import { WeeklySchedule } from '@/components/availability/WeeklySchedule'

type Tab = 'reservas' | 'disponibilidad'

const statusStyle: Record<string, string> = {
  confirmed: '#10b981',
  canceled: '#ef4444',
  completed: '#94a3b8',
  pending: '#f59e0b',
}

const statusLabel: Record<string, string> = {
  confirmed: 'Confirmada',
  canceled: 'Cancelada',
  completed: 'Completada',
  pending: 'Pendiente',
  no_show: 'No asistió',
}

interface BookingCardProps {
  booking: {
    id: string
    scheduled_at: string
    status: string
    customer_name: string | null
    customer_phone: string | null
    service_name: string | null
  }
  onComplete: () => void
  onCancel: () => void
}

function BookingCard({ booking, onComplete, onCancel }: BookingCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className="glass-card glass-card-hover p-4 flex items-center justify-between"
    >
      <div>
        <div className="font-medium" style={{ color: '#f1f5f9' }}>
          {booking.customer_name ?? booking.customer_phone ?? 'Cliente'}
          {booking.service_name && (
            <span className="ml-2 text-sm font-normal" style={{ color: '#06b6d4' }}>
              · {booking.service_name}
            </span>
          )}
        </div>
        <div className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
          {format(parseISO(booking.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
          {' · '}
          <span className="font-medium" style={{ color: statusStyle[booking.status] ?? '#94a3b8' }}>
            {statusLabel[booking.status] ?? booking.status}
          </span>
        </div>
        {booking.customer_phone && (
          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
            {booking.customer_phone}
          </div>
        )}
      </div>
      {booking.status === 'confirmed' && (
        <div className="flex gap-2">
          <button
            onClick={onComplete}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
          >
            Completar
          </button>
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            Cancelar
          </button>
        </div>
      )}
    </motion.div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'reservas', label: 'Reservas' },
    { key: 'disponibilidad', label: 'Disponibilidad' },
  ]
  return (
    <div
      className="flex gap-1 mb-6 p-1 rounded-lg"
      style={{ background: 'rgba(15,23,42,0.4)', width: 'fit-content' }}
    >
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={{
            background: active === t.key ? 'rgba(6,182,212,0.15)' : 'transparent',
            color: active === t.key ? '#06b6d4' : '#94a3b8',
            border: active === t.key ? '1px solid rgba(6,182,212,0.25)' : '1px solid transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

interface NewBookingForm {
  customer_phone: string
  customer_name: string
  service_id: string
  date: string
  time: string
}

function NewBookingModal({ onClose }: { onClose: () => void }) {
  const { data: services } = useServices()
  const createBooking = useCreateBooking()
  const [form, setForm] = useState<NewBookingForm>({
    customer_phone: '',
    customer_name: '',
    service_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.customer_phone || !form.service_id || !form.date || !form.time) {
      setError('Completa los campos obligatorios.')
      return
    }
    const scheduled_at = new Date(`${form.date}T${form.time}:00`).toISOString()
    try {
      await createBooking.mutateAsync({
        customer_phone: form.customer_phone,
        customer_name: form.customer_name || undefined,
        service_id: form.service_id,
        scheduled_at,
      })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'No se pudo crear la reserva.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-2xl"
        style={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: '#f1f5f9' }}>Nueva reserva</h2>
          <button onClick={onClose} style={{ color: '#475569' }} className="text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
              WhatsApp del cliente *
            </label>
            <input
              type="tel"
              placeholder="+56912345678"
              value={form.customer_phone}
              onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(6,182,212,0.15)',
                color: '#f1f5f9',
              }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
              Nombre del cliente
            </label>
            <input
              type="text"
              placeholder="Opcional"
              value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(6,182,212,0.15)',
                color: '#f1f5f9',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
              Servicio *
            </label>
            <select
              value={form.service_id}
              onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(6,182,212,0.15)',
                color: form.service_id ? '#f1f5f9' : '#475569',
              }}
              required
            >
              <option value="">Seleccionar servicio</option>
              {services?.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                Fecha *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                Hora *
              </label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createBooking.isPending}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: createBooking.isPending ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.25)',
                color: '#06b6d4',
              }}
            >
              {createBooking.isPending ? 'Guardando...' : 'Crear reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('reservas')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showNewBooking, setShowNewBooking] = useState(false)

  const dateFrom = startOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const dateTo = endOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const { data, isLoading } = useBookings(dateFrom, dateTo)
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()

  return (
    <div>
      {showNewBooking && <NewBookingModal onClose={() => setShowNewBooking(false)} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Agenda</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'reservas' && (
            <>
              <button
                onClick={() => setCurrentWeek(prevWeek(currentWeek))}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8', background: 'transparent' }}
              >
                ← Anterior
              </button>
              <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                {formatWeekRange(currentWeek)}
              </span>
              <button
                onClick={() => setCurrentWeek(nextWeek(currentWeek))}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8', background: 'transparent' }}
              >
                Siguiente →
              </button>
            </>
          )}
          <button
            onClick={() => setShowNewBooking(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'rgba(6,182,212,0.12)',
              border: '1px solid rgba(6,182,212,0.25)',
              color: '#06b6d4',
            }}
          >
            + Nueva reserva
          </button>
        </div>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'reservas' && (
        isLoading ? (
          <div className="text-sm" style={{ color: '#94a3b8' }}>Cargando reservas...</div>
        ) : data?.bookings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p style={{ color: '#94a3b8' }}>No hay reservas esta semana.</p>
            <button
              onClick={() => setShowNewBooking(true)}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(6,182,212,0.12)',
                border: '1px solid rgba(6,182,212,0.25)',
                color: '#06b6d4',
              }}
            >
              + Crear primera reserva
            </button>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {data?.bookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onComplete={() => completeBooking.mutate(booking.id)}
                onCancel={() => cancelBooking.mutate(booking.id)}
              />
            ))}
          </motion.div>
        )
      )}

      {activeTab === 'disponibilidad' && <WeeklySchedule />}
    </div>
  )
}
