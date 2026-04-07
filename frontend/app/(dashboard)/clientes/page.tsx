'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'
import api from '@/lib/api'

interface Customer {
  id: string
  name: string | null
  phone_number: string
  status: string
  total_bookings: number
  points_balance: number
  last_booking_at: string | null
  created_at: string
  upcoming_bookings: number
  completed_bookings: number
  canceled_bookings: number
}

interface CustomerListResponse {
  customers: Customer[]
  total: number
}

type SortField = 'last_booking_at' | 'total_bookings' | 'created_at' | 'name'
type SortDir = 'asc' | 'desc'
type StatusFilter = '' | 'active' | 'vip' | 'churned'

async function fetchCustomers(params: {
  search: string
  status: string
  order_by: SortField
  order_dir: SortDir
  offset: number
}): Promise<CustomerListResponse> {
  const { data } = await api.get('/api/v1/customers', { params: { ...params, limit: 50 } })
  return data
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Activo',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  vip:     { label: 'VIP',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  churned: { label: 'Inactivo', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  )
}

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <span className="text-xs" style={{ color }}>
      {value} {label}
    </span>
  )
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [orderBy, setOrderBy] = useState<SortField>('last_booking_at')
  const [orderDir, setOrderDir] = useState<SortDir>('desc')
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, status, orderBy, orderDir, offset],
    queryFn: () => fetchCustomers({ search, status, order_by: orderBy, order_dir: orderDir, offset }),
    placeholderData: (prev) => prev,
  })

  const PAGE_SIZE = 50

  function toggleSort(field: SortField) {
    if (orderBy === field) {
      setOrderDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setOrderBy(field)
      setOrderDir('desc')
    }
    setOffset(0)
  }

  function SortIcon({ field }: { field: SortField }) {
    if (orderBy !== field) return <span style={{ color: '#334155' }}>↕</span>
    return <span style={{ color: '#06b6d4' }}>{orderDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Clientes</h1>
          {data && (
            <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
              {data.total} cliente{data.total !== 1 ? 's' : ''} en total
            </p>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0) }}
          className="rounded-lg text-sm px-3 py-2 flex-1 min-w-48"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(6,182,212,0.15)',
            color: '#f1f5f9',
            outline: 'none',
          }}
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as StatusFilter); setOffset(0) }}
          className="rounded-lg text-sm px-3 py-2"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(6,182,212,0.15)',
            color: status ? '#f1f5f9' : '#64748b',
          }}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="vip">VIP</option>
          <option value="churned">Inactivo</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="glass-card overflow-hidden">
        {/* Encabezados */}
        <div
          className="hidden md:grid text-xs font-medium px-5 py-3"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
            color: '#475569',
            borderBottom: '1px solid rgba(6,182,212,0.08)',
          }}
        >
          <button className="text-left flex items-center gap-1" onClick={() => toggleSort('name')}>
            Cliente <SortIcon field="name" />
          </button>
          <span>Estado</span>
          <button className="flex items-center gap-1" onClick={() => toggleSort('total_bookings')}>
            Reservas <SortIcon field="total_bookings" />
          </button>
          <span>Detalle</span>
          <button className="flex items-center gap-1" onClick={() => toggleSort('last_booking_at')}>
            Última visita <SortIcon field="last_booking_at" />
          </button>
          <button className="flex items-center gap-1" onClick={() => toggleSort('created_at')}>
            Cliente desde <SortIcon field="created_at" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse"
                style={{ background: 'rgba(15,23,42,0.4)' }} />
            ))}
          </div>
        ) : !data?.customers.length ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-3">👥</div>
            <p className="text-sm" style={{ color: '#475569' }}>
              {search || status ? 'Sin resultados para este filtro' : 'Aún no hay clientes registrados'}
            </p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="divide-y" style={{ borderColor: 'rgba(6,182,212,0.06)' }}>
            {data.customers.map(c => (
              <motion.div
                key={c.id}
                variants={fadeInUp}
                className="px-5 py-3.5 grid items-center gap-4"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}
              >
                {/* Cliente */}
                <div>
                  <div className="font-medium text-sm" style={{ color: '#f1f5f9' }}>
                    {c.name ?? '—'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
                    {c.phone_number}
                  </div>
                </div>

                {/* Estado */}
                <StatusBadge status={c.status} />

                {/* Total reservas */}
                <div className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
                  {c.total_bookings}
                </div>

                {/* Detalle */}
                <div className="flex flex-col gap-0.5">
                  <StatPill value={c.upcoming_bookings} label="próximas" color="#06b6d4" />
                  <StatPill value={c.completed_bookings} label="completadas" color="#10b981" />
                  <StatPill value={c.canceled_bookings} label="canceladas" color="#ef4444" />
                </div>

                {/* Última visita */}
                <div className="text-xs" style={{ color: '#64748b' }}>
                  {c.last_booking_at
                    ? format(new Date(c.last_booking_at), "d MMM yyyy", { locale: es })
                    : '—'}
                </div>

                {/* Cliente desde */}
                <div className="text-xs" style={{ color: '#64748b' }}>
                  {format(new Date(c.created_at), "d MMM yyyy", { locale: es })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Paginación */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(6,182,212,0.08)' }}>
            <span className="text-xs" style={{ color: '#475569' }}>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} de {data.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: offset === 0 ? '#334155' : '#94a3b8',
                  background: 'transparent',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                }}
              >← Anterior</button>
              <button
                disabled={offset + PAGE_SIZE >= data.total}
                onClick={() => setOffset(o => o + PAGE_SIZE)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: offset + PAGE_SIZE >= data.total ? '#334155' : '#94a3b8',
                  background: 'transparent',
                  cursor: offset + PAGE_SIZE >= data.total ? 'not-allowed' : 'pointer',
                }}
              >Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
