'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'

const baseSchema = z.object({
  document_type: z.enum(['boleta', 'factura']),
  person_first_name: z.string().min(1, 'Requerido'),
  person_last_name: z.string().min(1, 'Requerido'),
  person_rut: z.string().min(1, 'Requerido'),
  person_email: z.string().email('Email inválido'),
  company_name: z.string().optional(),
  company_razon_social: z.string().optional(),
  company_rut: z.string().optional(),
  company_giro: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.document_type === 'factura') {
    const companyFields = ['company_name', 'company_razon_social', 'company_rut', 'company_giro'] as const
    for (const field of companyFields) {
      if (!data[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido', path: [field] })
      }
    }
  }
})

type FormData = z.infer<typeof baseSchema>

interface BillingProfileData {
  document_type: 'boleta' | 'factura'
  person_first_name: string
  person_last_name: string
  person_rut: string
  person_email: string
  company_name: string | null
  company_razon_social: string | null
  company_rut: string | null
  company_giro: string | null
}

interface Props {
  onClose: () => void
}

export function DocumentPreferenceModal({ onClose }: Props) {
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: { document_type: 'boleta' },
  })

  const documentType = watch('document_type')

  useEffect(() => {
    api.get<BillingProfileData | null>('/api/v1/billing/profile').then(({ data }) => {
      if (data) {
        reset({
          document_type: data.document_type,
          person_first_name: data.person_first_name,
          person_last_name: data.person_last_name,
          person_rut: data.person_rut,
          person_email: data.person_email,
          company_name: data.company_name ?? '',
          company_razon_social: data.company_razon_social ?? '',
          company_rut: data.company_rut ?? '',
          company_giro: data.company_giro ?? '',
        })
      }
    }).catch(() => {})
  }, [reset])

  const onSubmit = async (data: FormData) => {
    setSubmitError('')
    try {
      await api.put('/api/v1/billing/profile', data)
      onClose()
    } catch {
      setSubmitError('Error al guardar. Intenta nuevamente.')
    }
  }

  const inputClass = 'input-dark w-full px-3 py-2 text-sm'
  const labelClass = 'block text-sm font-medium mb-1'
  const errorClass = 'text-xs mt-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        style={{ border: '1px solid rgba(6,182,212,0.2)' }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ color: '#f1f5f9' }}>
          Datos de facturación
        </h2>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
          ¿Cómo prefieres recibir tu comprobante de pago?
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-4">
            {(['boleta', 'factura'] as const).map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer text-sm capitalize"
                style={{ color: documentType === type ? '#06b6d4' : '#94a3b8' }}
              >
                <input
                  type="radio"
                  value={type}
                  {...register('document_type')}
                  className="accent-cyan-400"
                />
                {type}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre</label>
              <input {...register('person_first_name')} className={inputClass} />
              {errors.person_first_name && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_first_name.message}</p>}
            </div>
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Apellido</label>
              <input {...register('person_last_name')} className={inputClass} />
              {errors.person_last_name && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_last_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>RUT</label>
              <input {...register('person_rut')} placeholder="12.345.678-9" className={inputClass} />
              {errors.person_rut && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_rut.message}</p>}
            </div>
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Email</label>
              <input {...register('person_email')} type="email" className={inputClass} />
              {errors.person_email && <p className={errorClass} style={{ color: '#f87171' }}>{errors.person_email.message}</p>}
            </div>
          </div>

          {documentType === 'factura' && (
            <>
              <div
                className="pt-3 mt-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#64748b', borderTop: '1px solid rgba(6,182,212,0.1)' }}
              >
                Datos empresa
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre empresa</label>
                <input {...register('company_name')} className={inputClass} />
                {errors.company_name && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_name.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Razón Social</label>
                <input {...register('company_razon_social')} className={inputClass} />
                {errors.company_razon_social && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_razon_social.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>RUT empresa</label>
                  <input {...register('company_rut')} placeholder="76.543.210-K" className={inputClass} />
                  {errors.company_rut && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_rut.message}</p>}
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>Giro</label>
                  <input {...register('company_giro')} placeholder="Desarrollo de Software" className={inputClass} />
                  {errors.company_giro && <p className={errorClass} style={{ color: '#f87171' }}>{errors.company_giro.message}</p>}
                </div>
              </div>
            </>
          )}

          {submitError && (
            <p className="text-sm" style={{ color: '#f87171' }}>{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-cyan w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}