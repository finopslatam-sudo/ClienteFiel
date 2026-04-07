'use client'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'
import api from '@/lib/api'

interface Summary {
  bookings_today: number
  bookings_pending: number
  total_customers: number
  customers_without_upcoming: number
  active_services: number
}

interface UpcomingBooking {
  id: string
  scheduled_at: string
  ends_at: string | null
  status: string
  service_name: string
  customer_name: string | null
  customer_phone: string
}

async function fetchSummary(): Promise<Summary> {
  const { data } = await api.get<Summary>('/api/v1/dashboard/summary')
  return data
}

async function fetchUpcoming(): Promise<{ bookings: UpcomingBooking[] }> {
  const { data } = await api.get<{ bookings: UpcomingBooking[] }>('/api/v1/dashboard/upcoming', { params: { limit: 8 } })
  return data
}

const statusColor: Record<string, string> = {
  confirmed: '#10b981',
  pending: '#f59e0b',
  completed: '#94a3b8',
  canceled: '#ef4444',
  no_show: '#ef4444',
}

interface KpiCardProps {
  label: string
  value: number
  icon: string
  color: string
  sub?: string
}

function KpiCard({ label, value, icon, color, sub }: KpiCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className="glass-card p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>{label}</span>
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          {icon}
        </span>
      </div>
      <div>
        <span className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>{value}</span>
        {sub && <p className="text-xs mt-1" style={{ color: '#475569' }}>{sub}</p>}
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchSummary,
    refetchInterval: 60_000,
  })

  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['dashboard-upcoming'],
    queryFn: fetchUpcoming,
    refetchInterval: 60_000,
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#475569' }}>
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* KPI Cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <KpiCard
            label="Citas hoy"
            value={summary.bookings_today}
            icon="📅"
            color="#06b6d4"
            sub="reservas activas"
          />
          <KpiCard
            label="Próximas citas"
            value={summary.bookings_pending}
            icon="⏳"
            color="#f59e0b"
            sub="pendientes de atender"
          />
          <KpiCard
            label="Total clientes"
            value={summary.total_customers}
            icon="👥"
            color="#10b981"
            sub={`${summary.active_services} servicio${summary.active_services !== 1 ? 's' : ''} activo${summary.active_services !== 1 ? 's' : ''}`}
          />
          <KpiCard
            label="Sin cita pendiente"
            value={summary.customers_without_upcoming}
            icon="🔔"
            color="#8b5cf6"
            sub="clientes para reactivar"
          />
        </motion.div>
      ) : null}

      {/* Próximas reservas */}
      <div className="glass-card overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>
            Próximas reservas
          </h2>
          <a
            href="/agenda"
            className="text-xs font-medium transition-colors"
            style={{ color: '#06b6d4' }}
          >
            Ver agenda →
          </a>
        </div>

        {loadingUpcoming ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'rgba(15,23,42,0.4)' }} />
            ))}
          </div>
        ) : !upcomingData?.bookings.length ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-3">🎉</div>
            <p className="text-sm" style={{ color: '#475569' }}>No hay reservas próximas</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(6,182,212,0.06)' }}>
            {upcomingData.bookings.map((b) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-1.5 h-10 rounded-full flex-shrink-0"
                    style={{ background: statusColor[b.status] ?? '#94a3b8' }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: '#f1f5f9' }}>
                      {b.customer_name ?? b.customer_phone}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      {b.service_name}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                    {format(new Date(b.scheduled_at + 'Z'), "d MMM", { locale: es })}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
                    {format(new Date(b.scheduled_at + 'Z'), "HH:mm", { locale: es })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
