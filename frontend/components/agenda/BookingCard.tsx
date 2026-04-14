// frontend/components/agenda/BookingCard.tsx
'use client'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { fadeInUp } from '@/lib/motion'

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

export interface BookingCardData {
  id: string
  scheduled_at: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  service_name: string | null
}

interface BookingCardProps {
  booking: BookingCardData
  onComplete: () => void
  onCancel: () => void
}

export function BookingCard({ booking, onComplete, onCancel }: BookingCardProps) {
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
