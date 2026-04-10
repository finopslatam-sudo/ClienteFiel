// frontend/app/(admin)/admin/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import adminApi from '@/lib/adminApi'

interface Metrics {
  total_tenants: number
  by_status: Record<string, number>
  by_plan: Record<string, number>
  whatsapp_connected: number
  new_this_month: number
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'Prueba',
  active: 'Activos',
  past_due: 'Pago pendiente',
  canceled: 'Cancelados',
}
const PLAN_LABELS: Record<string, string> = {
  basic: 'Básico',
  medium: 'Medio',
  premium: 'Premium',
}
const STATUS_COLORS: Record<string, string> = {
  trial: '#f59e0b',
  active: '#10b981',
  past_due: '#ef4444',
  canceled: '#64748b',
}
const PLAN_COLORS: Record<string, string> = {
  basic: '#06b6d4',
  medium: '#8b5cf6',
  premium: '#f59e0b',
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="glass-card p-5" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
      <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
      <div className="text-3xl font-bold" style={{ color: color ?? '#f1f5f9' }}>{value}</div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.get<Metrics>('/api/v1/admin/metrics')
      .then(({ data }) => setMetrics(data))
      .catch(() => setError('No se pudieron cargar las métricas.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Dashboard</h1>
      <p className="text-sm mb-8" style={{ color: '#475569' }}>Métricas globales de la plataforma</p>

      {loading && <p style={{ color: '#475569' }}>Cargando...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total clientes" value={metrics.total_tenants} />
            <StatCard label="WhatsApp conectado" value={metrics.whatsapp_connected} color="#10b981" />
            <StatCard label="Nuevos este mes" value={metrics.new_this_month} color="#06b6d4" />
            <StatCard label="Activos" value={metrics.by_status.active ?? 0} color="#10b981" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-5" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: '#94a3b8' }}>Por estado</h2>
              <div className="space-y-3">
                {Object.entries(metrics.by_status).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: STATUS_COLORS[k] ?? '#64748b' }} />
                      <span className="text-sm" style={{ color: '#94a3b8' }}>{STATUS_LABELS[k] ?? k}</span>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: '#94a3b8' }}>Por plan</h2>
              <div className="space-y-3">
                {Object.entries(metrics.by_plan).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: PLAN_COLORS[k] ?? '#94a3b8' }} />
                      <span className="text-sm" style={{ color: '#94a3b8' }}>{PLAN_LABELS[k] ?? k}</span>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}
