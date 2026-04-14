// frontend/app/(dashboard)/agenda/page.tsx
'use client'
import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  format,
} from 'date-fns'
import { motion } from 'framer-motion'
import { useBookings, useCancelBooking, useCompleteBooking, useCreateBooking } from '@/lib/hooks/useBookings'
import { useServices } from '@/lib/hooks/useServices'
import { staggerContainer, fadeInUp } from '@/lib/motion'
import { WeeklySchedule } from '@/components/availability/WeeklySchedule'
import { MonthlyCalendar } from '@/components/agenda/MonthlyCalendar'

type Tab = 'reservas' | 'disponibilidad'

interface NewBookingForm {
  customer_phone: string
  customer_name: string
  service_id: string
  date: string
  time: string
}

function NewBookingModal({
  onClose,
  initialDate,
}: {
  onClose: () => void
  initialDate?: Date
}) {
  const { data: services } = useServices()
  const createBooking = useCreateBooking()
  const [form, setForm] = useState<NewBookingForm>({
    customer_phone: '',
    customer_name: '',
    service_id: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
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

export default function AgendaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('reservas')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [newBookingDate, setNewBookingDate] = useState<Date | undefined>(undefined)
  const [showNewBooking, setShowNewBooking] = useState(false)

  // Rango: desde el lunes de la primera semana hasta el domingo de la última semana del mes
  const dateFrom = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString()
  const dateTo = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString()

  const { data, isLoading } = useBookings(dateFrom, dateTo)
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()

  const handleNewBooking = (date?: Date) => {
    setNewBookingDate(date)
    setShowNewBooking(true)
  }

  return (
    <div>
      {showNewBooking && (
        <NewBookingModal
          initialDate={newBookingDate}
          onClose={() => { setShowNewBooking(false); setNewBookingDate(undefined) }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Agenda</h1>
        <button
          onClick={() => handleNewBooking()}
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

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'reservas' && (
        isLoading ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-7 gap-1"
          >
            {Array.from({ length: 35 }).map((_, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="min-h-[72px] rounded-lg animate-pulse"
                style={{ background: 'rgba(15,23,42,0.3)' }}
              />
            ))}
          </motion.div>
        ) : (
          <MonthlyCalendar
            bookings={data?.bookings ?? []}
            currentMonth={currentMonth}
            onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
            onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
            onComplete={(id) => completeBooking.mutate(id)}
            onCancel={(id) => cancelBooking.mutate(id)}
            onNewBooking={handleNewBooking}
          />
        )
      )}

      {activeTab === 'disponibilidad' && <WeeklySchedule />}
    </div>
  )
}
