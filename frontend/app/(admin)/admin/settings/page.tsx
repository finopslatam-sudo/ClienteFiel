// frontend/app/(admin)/admin/settings/page.tsx
'use client'
import { useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import adminApi from '@/lib/adminApi'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
    </svg>
  )
}

export default function AdminSettingsPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
              <div className="relative">
                <input
                  type={showNext ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                  className="input-dark w-full px-3 py-2 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }}
                >
                  <EyeIcon open={showNext} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="input-dark w-full px-3 py-2 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
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
