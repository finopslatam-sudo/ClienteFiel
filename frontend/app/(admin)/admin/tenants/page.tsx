// frontend/app/(admin)/admin/tenants/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import adminApi from '@/lib/adminApi'

interface TenantSubscription {
  plan: string
  status: string
  provider: string
  external_subscription_id: string | null
}

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  trial_ends_at: string | null
  created_at: string
  user_count: number
  whatsapp_connected: boolean
  subscription: TenantSubscription | null
}

const STATUS_COLORS: Record<string, string> = {
  trial: '#f59e0b', active: '#10b981', past_due: '#ef4444', canceled: '#64748b',
}
const STATUS_LABELS: Record<string, string> = {
  trial: 'Prueba', active: 'Activo', past_due: 'Pago pend.', canceled: 'Cancelado',
}
const PLAN_LABELS: Record<string, string> = { basic: 'Básico', medium: 'Medio', premium: 'Premium' }
const PLANS = ['basic', 'medium', 'premium']

export default function AdminTenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)

  const load = useCallback((q = '') => {
    setLoading(true)
    adminApi.get<Tenant[]>('/api/v1/admin/tenants', { params: { search: q, limit: 100 } })
      .then(({ data }) => setTenants(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search)
  }

  const handlePlanChange = async (tenantId: string, newPlan: string) => {
    setChangingPlan(tenantId)
    try {
      const { data } = await adminApi.put<Tenant>(`/api/v1/admin/tenants/${tenantId}/plan`, { plan: newPlan })
      setTenants((prev) => prev.map((t) => t.id === tenantId ? { ...t, plan: data.plan, subscription: data.subscription } : t))
    } finally {
      setChangingPlan(null)
    }
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Clientes</h1>
        <span className="text-sm" style={{ color: '#475569' }}>{tenants.length} registros</span>
      </div>
      <p className="text-sm mb-6" style={{ color: '#475569' }}>Gestiona planes y estados de todos los tenants</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="input-dark px-3 py-2 text-sm flex-1"
        />
        <button type="submit" className="btn-ghost-cyan px-4 py-2 rounded-lg text-sm">Buscar</button>
      </form>

      {loading ? (
        <p style={{ color: '#475569' }}>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                {['Negocio', 'Estado', 'Plan actual', 'WA', 'Usuarios', 'Registro', 'Cambiar plan', 'Detalle'].map((h) => (
                  <th key={h} className="text-left pb-3 pr-4 font-medium" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}>
                  <td className="py-3 pr-4 font-medium" style={{ color: '#f1f5f9' }}>
                    <div>{t.name}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{t.slug}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                      background: `${STATUS_COLORS[t.status]}20`,
                      color: STATUS_COLORS[t.status] ?? '#94a3b8',
                    }}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4" style={{ color: '#94a3b8' }}>
                    {PLAN_LABELS[t.plan] ?? t.plan}
                  </td>
                  <td className="py-3 pr-4">
                    <span style={{ color: t.whatsapp_connected ? '#10b981' : '#475569' }}>
                      {t.whatsapp_connected ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-4" style={{ color: '#94a3b8' }}>{t.user_count}</td>
                  <td className="py-3 pr-4" style={{ color: '#475569' }}>
                    {new Date(t.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={t.plan}
                      disabled={changingPlan === t.id}
                      onChange={(e) => handlePlanChange(t.id, e.target.value)}
                      className="input-dark text-xs px-2 py-1 rounded"
                      style={{ minWidth: '90px' }}
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => router.push(`/admin/tenants/${t.id}`)}
                      className="text-xs px-3 py-1 rounded-lg"
                      style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
