// frontend/app/(admin)/admin/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import adminApi from '@/lib/adminApi'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await adminApi.post<{ access_token: string }>('/api/v1/admin/auth/login', { email, password })
      localStorage.setItem('admin_access_token', data.access_token)
      router.push('/admin/dashboard')
    } catch {
      setError('Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#030d1a' }}>
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}
      >
        <div className="mb-8 text-center">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#06b6d4' }}>CLIENTE FIEL</div>
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Panel de Administración</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Acceso restringido</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-dark w-full px-3 py-2 text-sm"
              placeholder="admin@clientefiel.cl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-dark w-full px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-cyan w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
