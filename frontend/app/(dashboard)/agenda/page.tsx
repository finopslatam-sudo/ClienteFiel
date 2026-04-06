// frontend/app/(dashboard)/agenda/page.tsx
'use client'
import { useState } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useBookings, useCancelBooking, useCompleteBooking } from '@/lib/hooks/useBookings'
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

interface BookingCardProps {
  booking: { id: string; scheduled_at: string; status: string }
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
          {format(new Date(booking.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
        </div>
        <div className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
          ID: {booking.id.slice(0, 8)}... ·{' '}
          <span className="font-medium" style={{ color: statusStyle[booking.status] ?? '#94a3b8' }}>
            {booking.status}
          </span>
        </div>
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

export default function AgendaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('reservas')
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const dateFrom = startOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const dateTo = endOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const { data, isLoading } = useBookings(dateFrom, dateTo)
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Agenda</h1>
        {activeTab === 'reservas' && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'reservas' && (
        isLoading ? (
          <div className="text-sm" style={{ color: '#94a3b8' }}>Cargando reservas...</div>
        ) : data?.bookings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p style={{ color: '#94a3b8' }}>No hay reservas esta semana.</p>
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
