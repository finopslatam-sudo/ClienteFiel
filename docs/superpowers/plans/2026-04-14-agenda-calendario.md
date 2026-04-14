# Agenda — Calendario Mensual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la vista de lista semanal de la pestaña "Reservas" por un calendario mensual interactivo con chips por día y panel de detalle al hacer clic.

**Architecture:** Se extrae `BookingCard` a su propio componente, se crea `MonthlyCalendar` (grid + DayDetailPanel), y la página `agenda/page.tsx` delega el renderizado del calendario al nuevo componente manteniendo el estado del mes para controlar el rango de la query. La pestaña "Disponibilidad" y el hook `useBookings` no se tocan.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, framer-motion, date-fns (ya instalado), TanStack Query (ya instalado).

---

## Archivos

- **Create:** `frontend/components/agenda/BookingCard.tsx`
- **Create:** `frontend/components/agenda/MonthlyCalendar.tsx`
- **Modify:** `frontend/app/(dashboard)/agenda/page.tsx`
- **Modify:** `frontend/lib/hooks/useBookings.ts` (exportar tipo `Booking`)

---

### Task 1: Exportar tipo Booking y extraer BookingCard

**Files:**
- Modify: `frontend/lib/hooks/useBookings.ts`
- Create: `frontend/components/agenda/BookingCard.tsx`

- [ ] **Step 1: Exportar `Booking` desde useBookings.ts**

Abrir `frontend/lib/hooks/useBookings.ts`. Cambiar `interface Booking` por `export interface Booking`:

```typescript
// frontend/lib/hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Booking {
  id: string
  customer_id: string
  service_id: string
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'no_show'
  created_by: 'whatsapp' | 'admin'
  created_at: string
  customer_name: string | null
  customer_phone: string | null
  service_name: string | null
}

export function useBookings(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['bookings', dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const { data } = await api.get<{ bookings: Booking[]; total: number }>('/api/v1/bookings', { params })
      return data
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/v1/bookings/${bookingId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useCompleteBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/v1/bookings/${bookingId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      customer_phone: string
      customer_name?: string
      service_id: string
      scheduled_at: string
    }) => api.post('/api/v1/bookings', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}
```

- [ ] **Step 2: Crear BookingCard.tsx**

Crear `frontend/components/agenda/BookingCard.tsx` con el contenido exactamente igual al componente `BookingCard` y sus constantes que actualmente están en `frontend/app/(dashboard)/agenda/page.tsx` (líneas 15–91):

```typescript
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
```

- [ ] **Step 3: Verificar que el build sigue funcionando**

```bash
cd frontend && npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/hooks/useBookings.ts frontend/components/agenda/BookingCard.tsx
git commit -m "refactor(agenda): extract BookingCard component and export Booking type"
```

---

### Task 2: Crear MonthlyCalendar

**Files:**
- Create: `frontend/components/agenda/MonthlyCalendar.tsx`

- [ ] **Step 1: Crear el componente MonthlyCalendar.tsx**

```typescript
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
```

- [ ] **Step 2: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/agenda/MonthlyCalendar.tsx
git commit -m "feat(agenda): add MonthlyCalendar component with day detail panel"
```

---

### Task 3: Actualizar agenda/page.tsx

**Files:**
- Modify: `frontend/app/(dashboard)/agenda/page.tsx`

El objetivo es:
1. Reemplazar el estado `currentWeek` por `currentMonth` (inicializado a `startOfMonth(new Date())`)
2. Calcular el rango de la query incluyendo semanas parciales del mes
3. Reemplazar la lista de `BookingCard` por el componente `MonthlyCalendar`
4. Actualizar `NewBookingModal` para aceptar `initialDate?: Date`
5. Importar `BookingCard` desde el nuevo archivo en vez de definirlo inline
6. Eliminar las constantes `statusStyle`, `statusLabel` y la definición inline de `BookingCard` (ya extraídas)

- [ ] **Step 1: Reemplazar agenda/page.tsx completo**

```typescript
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
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 3: Verificar lint**

```bash
cd frontend && npx next lint
```

Resultado esperado: sin errores de lint.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(dashboard)/agenda/page.tsx
git commit -m "feat(agenda): replace weekly list with monthly calendar view"
```

---

### Task 4: Verificación final

- [ ] **Step 1: Build de producción**

```bash
cd frontend && npx next build
```

Resultado esperado: `✓ Compiled successfully`, sin errores.

- [ ] **Step 2: Commit final si el build pasó**

```bash
git add -A
git commit -m "feat(agenda): monthly calendar view complete" --allow-empty
```

> Si no hay nada nuevo que commitear (todos los cambios ya están commiteados), omitir este paso.
