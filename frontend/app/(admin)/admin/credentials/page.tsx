// frontend/app/(admin)/admin/credentials/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
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

interface WhatsAppInfo {
  phone_number: string
  phone_number_id: string
  meta_waba_id: string | null
  is_active: boolean
  verified_at: string | null
  token_expires_at: string | null
}

export default function AdminCredentialsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [creds, setCreds] = useState<WhatsAppInfo | null | 'loading'>('loading')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback((q = '') => {
    setLoading(true)
    adminApi.get<Tenant[]>('/api/v1/admin/tenants', { params: { search: q, limit: 100 } })
      .then(({ data }) => setTenants(data.filter((t) => t.whatsapp_connected)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const selectTenant = async (id: string) => {
    setSelected(id)
    setCreds('loading')
    const { data } = await adminApi.get<WhatsAppInfo | null>(`/api/v1/admin/tenants/${id}/credentials`)
    setCreds(data)
  }

  const selectedTenant = tenants.find((t) => t.id === selected)

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Credenciales WhatsApp</h1>
      <p className="text-sm mb-6" style={{ color: '#475569' }}>
        Metadatos de conexión por tenant. El access token nunca se expone.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lista */}
        <div>
          <form
            onSubmit={(e) => { e.preventDefault(); load(search) }}
            className="flex gap-2 mb-4"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tenant..."
              className="input-dark px-3 py-2 text-sm flex-1"
            />
            <button type="submit" className="btn-ghost-cyan px-4 py-2 rounded-lg text-sm">Buscar</button>
          </form>

          {loading ? (
            <p style={{ color: '#475569' }}>Cargando...</p>
          ) : (
            <div className="space-y-2">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTenant(t.id)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                  style={{
                    background: selected === t.id ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.03)',
                    border: `1px solid ${selected === t.id ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.08)'}`,
                  }}
                >
                  <div className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{t.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{t.slug}</div>
                </button>
              ))}
              {tenants.length === 0 && (
                <p className="text-sm" style={{ color: '#475569' }}>Ningún tenant con WhatsApp conectado.</p>
              )}
            </div>
          )}
        </div>

        {/* Detalle credenciales */}
        <div>
          {!selected && (
            <div
              className="h-40 flex items-center justify-center rounded-xl"
              style={{ border: '1px solid rgba(6,182,212,0.08)', color: '#475569' }}
            >
              Selecciona un tenant
            </div>
          )}

          {selected && creds === 'loading' && (
            <p style={{ color: '#475569' }}>Cargando...</p>
          )}

          {selected && creds !== 'loading' && creds === null && (
            <div className="glass-card p-5" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
              <p className="text-sm" style={{ color: '#475569' }}>Sin credenciales registradas.</p>
            </div>
          )}

          {selected && creds !== 'loading' && creds !== null && (
            <div className="glass-card p-5" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
              <h2 className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748b' }}>
                {selectedTenant?.name}
              </h2>

              <div className="space-y-3">
                {[
                  { label: 'Número', value: creds.phone_number },
                  { label: 'Phone Number ID', value: creds.phone_number_id },
                  { label: 'WABA ID', value: creds.meta_waba_id },
                  { label: 'Activo', value: creds.is_active ? 'Sí' : 'No' },
                  {
                    label: 'Verificado',
                    value: creds.verified_at ? new Date(creds.verified_at).toLocaleDateString('es-CL') : '—',
                  },
                  {
                    label: 'Token vence',
                    value: creds.token_expires_at ? new Date(creds.token_expires_at).toLocaleDateString('es-CL') : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}>
                    <span className="text-sm" style={{ color: '#64748b' }}>{label}</span>
                    <span className="text-sm font-medium font-mono" style={{ color: '#f1f5f9' }}>{value ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(239,68,68,0.07)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                El access_token está cifrado en base de datos y nunca se transmite a este panel.
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
