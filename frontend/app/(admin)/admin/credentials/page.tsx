// frontend/app/(admin)/admin/credentials/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import adminApi from '@/lib/adminApi'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  user_count: number
}

interface UserInfo {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface TenantDetail {
  users: UserInfo[]
}

interface EditState {
  userId: string
  first_name: string
  last_name: string
  email: string
}

interface ResetResult {
  userId: string
  tempPassword: string
}

export default function AdminCredentialsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<ResetResult | null>(null)
  const [saveError, setSaveError] = useState('')

  const loadTenants = useCallback((q = '') => {
    setLoadingTenants(true)
    adminApi.get<Tenant[]>('/api/v1/admin/tenants', { params: { search: q, limit: 100 } })
      .then(({ data }) => setTenants(data))
      .finally(() => setLoadingTenants(false))
  }, [])

  useEffect(() => { loadTenants() }, [loadTenants])

  const selectTenant = async (id: string) => {
    setSelected(id)
    setEditing(null)
    setResetResult(null)
    setLoadingUsers(true)
    const { data } = await adminApi.get<TenantDetail>(`/api/v1/admin/tenants/${id}`)
    setUsers(data.users)
    setLoadingUsers(false)
  }

  const startEdit = (u: UserInfo) => {
    setSaveError('')
    setEditing({
      userId: u.id,
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      email: u.email,
    })
  }

  const cancelEdit = () => {
    setEditing(null)
    setSaveError('')
  }

  const saveEdit = async () => {
    if (!editing || !selected) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: updated } = await adminApi.put<UserInfo>(
        `/api/v1/admin/tenants/${selected}/users/${editing.userId}`,
        {
          first_name: editing.first_name || null,
          last_name: editing.last_name || null,
          email: editing.email,
        }
      )
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
      setEditing(null)
    } catch {
      setSaveError('Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (userId: string) => {
    if (!selected) return
    setResetting(userId)
    setResetResult(null)
    try {
      const { data } = await adminApi.post<{ temporary_password: string }>(
        `/api/v1/admin/tenants/${selected}/reset-password`,
        { user_id: userId }
      )
      setResetResult({ userId, tempPassword: data.temporary_password })
    } finally {
      setResetting(null)
    }
  }

  const selectedTenant = tenants.find((t) => t.id === selected)

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Usuarios</h1>
      <p className="text-sm mb-6" style={{ color: '#475569' }}>
        Gestión de usuarios por cliente
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lista de tenants */}
        <div>
          <form
            onSubmit={(e) => { e.preventDefault(); loadTenants(search) }}
            className="flex gap-2 mb-4"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="input-dark px-3 py-2 text-sm flex-1"
            />
            <button type="submit" className="btn-ghost-cyan px-4 py-2 rounded-lg text-sm">Buscar</button>
          </form>

          {loadingTenants ? (
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
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{t.name}</div>
                    <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.1)', color: '#67e8f9' }}>
                      {t.user_count} usuario{t.user_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{t.plan} · {t.status}</div>
                </button>
              ))}
              {tenants.length === 0 && (
                <p className="text-sm" style={{ color: '#475569' }}>Sin clientes.</p>
              )}
            </div>
          )}
        </div>

        {/* Detalle usuarios */}
        <div>
          {!selected && (
            <div
              className="h-40 flex items-center justify-center rounded-xl"
              style={{ border: '1px solid rgba(6,182,212,0.08)', color: '#475569' }}
            >
              Selecciona un cliente
            </div>
          )}

          {selected && loadingUsers && (
            <p style={{ color: '#475569' }}>Cargando usuarios...</p>
          )}

          {selected && !loadingUsers && (
            <div className="glass-card p-5" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
              <h2 className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748b' }}>
                {selectedTenant?.name?.toUpperCase()}
              </h2>

              {users.length === 0 && (
                <p className="text-sm" style={{ color: '#475569' }}>Sin usuarios.</p>
              )}

              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id}>
                    {editing?.userId === u.id ? (
                      /* Edit form */
                      <div
                        className="p-4 rounded-xl space-y-3"
                        style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#64748b' }}>Nombre</label>
                            <input
                              value={editing.first_name}
                              onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
                              className="input-dark w-full px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#64748b' }}>Apellido</label>
                            <input
                              value={editing.last_name}
                              onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
                              className="input-dark w-full px-2 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#64748b' }}>Email</label>
                          <input
                            value={editing.email}
                            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                            className="input-dark w-full px-2 py-1.5 text-sm"
                            type="email"
                          />
                        </div>
                        {saveError && (
                          <p className="text-xs" style={{ color: '#ef4444' }}>{saveError}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={cancelEdit}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ color: '#64748b', border: '1px solid rgba(100,116,139,0.3)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{
                              background: 'rgba(6,182,212,0.15)',
                              border: '1px solid rgba(6,182,212,0.3)',
                              color: '#67e8f9',
                              opacity: saving ? 0.6 : 1,
                            }}
                          >
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* User row */
                      <div
                        className="py-2.5 px-3 rounded-xl"
                        style={{ border: '1px solid rgba(6,182,212,0.06)' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                              {u.first_name || u.last_name
                                ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                                : '—'}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{u.email}</div>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs" style={{ color: '#64748b' }}>{u.role}</span>
                              <span className="text-xs" style={{ color: u.is_active ? '#10b981' : '#ef4444' }}>
                                {u.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => startEdit(u)}
                              className="text-xs px-2.5 py-1 rounded-lg"
                              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleReset(u.id)}
                              disabled={resetting === u.id}
                              className="text-xs px-2.5 py-1 rounded-lg"
                              style={{
                                background: 'rgba(239,68,68,0.07)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444',
                                opacity: resetting === u.id ? 0.5 : 1,
                              }}
                            >
                              {resetting === u.id ? '...' : 'Reset pwd'}
                            </button>
                          </div>
                        </div>
                        {resetResult?.userId === u.id && (
                          <div
                            className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between"
                            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
                          >
                            <span>
                              Contraseña temporal:{' '}
                              <span className="font-mono font-bold" style={{ color: '#f1f5f9' }}>
                                {resetResult.tempPassword}
                              </span>
                            </span>
                            <button onClick={() => setResetResult(null)} style={{ color: '#475569' }}>✕</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
