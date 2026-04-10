// frontend/app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { login } from '@/lib/auth'
import adminApi from '@/lib/adminApi'
import { fadeInUp } from '@/lib/motion'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    // Try tenant login first
    try {
      await login(data)
      const redirect = searchParams.get('redirect')
      router.push(redirect && !redirect.startsWith('/admin') ? redirect : '/agenda')
      return
    } catch {
      // not a tenant user — try superadmin
    }
    // Try superadmin login
    try {
      const { data: adminData } = await adminApi.post<{ access_token: string }>(
        '/api/v1/admin/auth/login',
        { email: data.email, password: data.password }
      )
      localStorage.setItem('admin_access_token', adminData.access_token)
      router.push('/admin/dashboard')
      return
    } catch {
      setError('Email o contraseña incorrectos')
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="glass-card p-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
        Iniciar sesión
      </h1>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>Bienvenido de vuelta</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@negocio.cl"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Contraseña
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-cyan w-full py-3 rounded-lg text-sm"
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#94a3b8' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="font-medium hover:underline" style={{ color: '#06b6d4' }}>
          Prueba gratis 14 días
        </Link>
      </p>
    </motion.div>
  )
}
