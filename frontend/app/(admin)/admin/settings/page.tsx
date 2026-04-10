// frontend/app/(admin)/admin/settings/page.tsx
'use client'
import { useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import adminApi from '@/lib/adminApi'

export default function AdminSettingsPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (next.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await adminApi.put('/api/v1/admin/auth/password', {
        current_password: current,
        new_password: next,
      })
      setSuccess('Contraseña actualizada correctamente.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Error al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Ajustes</h1>
      <p className="text-sm mb-8" style={{ color: '#475569' }}>Configuración de tu cuenta de superadmin</p>

      <div className="max-w-md">
        <div className="glass-card p-6" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
          <h2 className="text-sm font-bold tracking-widest mb-5" style={{ color: '#64748b' }}>
            CAMBIAR CONTRASEÑA
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Contraseña actual</label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="input-dark w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Nueva contraseña</label>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                className="input-dark w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="input-dark w-full px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            )}
            {success && (
              <p className="text-sm" style={{ color: '#10b981' }}>{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium transition-opacity"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  )
}
