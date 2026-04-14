// frontend/components/agenda/MonthlyCalendar.tsx
'use client'
import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Booking } from '@/lib/hooks/useBookings'
import { BookingCard } from './BookingCard'

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#06b6d4',
  pending: '#f59e0b',
  completed: '#475569',
  no_show: '#ef4444',
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface MonthlyCalendarProps {
  bookings: Booking[]
  currentMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onNewBooking: (date?: Date) => void
}

export function MonthlyCalendar({
  bookings,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onComplete,
  onCancel,
  onNewBooking,
}: MonthlyCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getBookingsForDay = (day: Date) =>
    bookings.filter(b => b.status !== 'canceled' && isSameDay(parseISO(b.scheduled_at), day))

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : []

  return (
    <div className="relative">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8', background: 'transparent' }}
        >
          ← Anterior
        </button>
        <h2
          className="font-semibold capitalize"
          style={{ color: '#f1f5f9' }}
        >
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h2>
        <button
          onClick={onNextMonth}
          className="px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ border: '1px solid rgba(6,182,212,0.15)', color: '#94a3b8', background: 'transparent' }}
        >
          Siguiente →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map(d => (
          <div
            key={d}
            className="text-center py-2 text-xs font-medium"
            style={{ color: '#475569' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayBookings = getBookingsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const isTodayDay = isToday(day)
          const hasBookings = dayBookings.length > 0

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className="min-h-[72px] p-1 rounded-lg cursor-pointer transition-colors"
              style={{
                background: isSelected
                  ? 'rgba(6,182,212,0.12)'
                  : hasBookings
                  ? 'rgba(15,23,42,0.5)'
                  : 'rgba(15,23,42,0.25)',
                border: isSelected
                  ? '1px solid rgba(6,182,212,0.4)'
                  : hasBookings
                  ? '1px solid rgba(6,182,212,0.12)'
                  : '1px solid rgba(6,182,212,0.05)',
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
            >
              {/* Day number */}
              <div className="flex justify-end mb-0.5">
                <span
                  className="text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full"
                  style={{
                    background: isTodayDay ? 'rgba(6,182,212,0.2)' : 'transparent',
                    border: isTodayDay ? '1px solid rgba(6,182,212,0.5)' : 'none',
                    color: isTodayDay ? '#06b6d4' : isCurrentMonth ? '#f1f5f9' : '#475569',
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Booking chips */}
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map(b => (
                  <div
                    key={b.id}
                    className="px-1 py-0.5 rounded truncate leading-tight"
                    style={{
                      background: `${STATUS_COLOR[b.status] ?? '#94a3b8'}22`,
                      color: STATUS_COLOR[b.status] ?? '#94a3b8',
                      fontSize: '10px',
                    }}
                  >
                    {format(parseISO(b.scheduled_at), 'HH:mm')}{' '}
                    {b.customer_name ?? b.customer_phone ?? ''}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div
                    className="text-center leading-tight"
                    style={{ color: '#64748b', fontSize: '10px' }}
                  >
                    +{dayBookings.length - 3} más
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day detail panel overlay */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setSelectedDay(null)}
        />
      )}

      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 z-40 overflow-y-auto shadow-2xl"
            style={{ background: '#080f1e', borderLeft: '1px solid rgba(6,182,212,0.15)' }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3
                  className="font-semibold capitalize"
                  style={{ color: '#f1f5f9' }}
                >
                  {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xl leading-none transition-colors"
                  style={{ color: '#475569' }}
                >
                  ×
                </button>
              </div>

              <button
                onClick={() => { onNewBooking(selectedDay); setSelectedDay(null) }}
                className="w-full py-2 rounded-lg text-sm font-medium mb-5 transition-colors"
                style={{
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.25)',
                  color: '#06b6d4',
                }}
              >
                + Nueva reserva para este día
              </button>

              {selectedDayBookings.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-3xl mb-3">📅</div>
                  <p className="text-sm" style={{ color: '#475569' }}>Sin reservas este día</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map(b => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onComplete={() => { onComplete(b.id); setSelectedDay(null) }}
                      onCancel={() => { onCancel(b.id); setSelectedDay(null) }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
