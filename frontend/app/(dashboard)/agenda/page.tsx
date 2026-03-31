// frontend/app/(dashboard)/agenda/page.tsx
'use client'
import { useState } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBookings, useCancelBooking, useCompleteBooking } from '@/lib/hooks/useBookings'
import { formatWeekRange, nextWeek, prevWeek } from '@/lib/utils/dates'

export default function AgendaPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const dateFrom = startOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const dateTo = endOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const { data, isLoading } = useBookings(dateFrom, dateTo)
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeek(prevWeek(currentWeek))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            ← Anterior
          </button>
          <span className="text-sm font-medium text-slate-700">
            {formatWeekRange(currentWeek)}
          </span>
          <button
            onClick={() => setCurrentWeek(nextWeek(currentWeek))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Cargando reservas...</div>
      ) : data?.bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-slate-600">No hay reservas esta semana.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-slate-900">
                  {format(new Date(booking.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  ID: {booking.id.slice(0, 8)}... ·{' '}
                  <span
                    className={`font-medium ${
                      booking.status === 'confirmed' ? 'text-emerald-600' :
                      booking.status === 'canceled' ? 'text-red-500' :
                      booking.status === 'completed' ? 'text-slate-500' :
                      'text-amber-600'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
              {booking.status === 'confirmed' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => completeBooking.mutate(booking.id)}
                    className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Completar
                  </button>
                  <button
                    onClick={() => cancelBooking.mutate(booking.id)}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
