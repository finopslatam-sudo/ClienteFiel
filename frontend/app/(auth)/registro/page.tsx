'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { register as registerUser } from '@/lib/auth'
import { fadeInUp } from '@/lib/motion'

const VALID_PLANS = ['basic', 'medium', 'premium'] as const

const schema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  business_name: z.string().min(2, 'Nombre del negocio requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan && (VALID_PLANS as readonly string[]).includes(plan)) {
      localStorage.setItem('pending_plan', plan)
    }
  }, [searchParams])
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await registerUser(data)
      router.push('/onboarding')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Error al crear la cuenta. Intenta nuevamente.')
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="glass-card p-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
        Crear tu cuenta gratis
      </h1>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>14 días gratis · Sin tarjeta de crédito</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
              Nombre
            </label>
            <input
              {...register('first_name')}
              placeholder="Richard"
              className="input-dark w-full px-3 py-2 text-sm"
            />
            {errors.first_name && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
              Apellido
            </label>
            <input
              {...register('last_name')}
              placeholder="Chamorro"
              className="input-dark w-full px-3 py-2 text-sm"
            />
            {errors.last_name && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Nombre del negocio
          </label>
          <input
            {...register('business_name')}
            placeholder="Peluquería Style"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.business_name && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.business_name.message}</p>
          )}
        </div>

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
            placeholder="Mínimo 8 caracteres"
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
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
        </button>

        <p className="text-center text-xs" style={{ color: '#475569' }}>
          Sin tarjeta hasta el día 14 · Cancela cuando quieras
        </p>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#94a3b8' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium hover:underline" style={{ color: '#06b6d4' }}>
          Iniciar sesión
        </Link>
      </p>
    </motion.div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  )
}