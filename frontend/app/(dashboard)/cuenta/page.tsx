'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'

// --- Account section ---
const accountSchema = z.object({
  first_name: z.string().min(1, 'Requerido'),
  last_name: z.string().min(1, 'Requerido'),
  company_name: z.string().min(1, 'Requerido'),
})
type AccountForm = z.infer<typeof accountSchema>

interface AccountData {
  first_name: string | null
  last_name: string | null
  email: string
  company_name: string
}

// --- Billing profile section ---
const billingSchema = z.object({
  document_type: z.enum(['boleta', 'factura']),
  person_first_name: z.string().min(1, 'Requerido'),
  person_last_name: z.string().min(1, 'Requerido'),
  person_rut: z.string().min(1, 'Requerido'),
  person_email: z.string().email('Email inválido'),
  company_razon_social: z.string().optional(),
  company_rut: z.string().optional(),
  company_giro: z.string().optional(),
  company_address: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.document_type === 'factura') {
    const fields = ['company_razon_social', 'company_rut', 'company_giro', 'company_address'] as const
    for (const f of fields) {
      if (!data[f]) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido', path: [f] })
    }
  }
})
type BillingForm = z.infer<typeof billingSchema>

interface BillingProfileData {
  document_type: 'boleta' | 'factura'
  person_first_name: string
  person_last_name: string
  person_rut: string
  person_email: string
  company_razon_social: string | null
  company_rut: string | null
  company_giro: string | null
  company_address: string | null
}

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}

const inputClass = 'input-dark w-full px-3 py-2 text-sm'
const labelClass = 'block text-sm font-medium mb-1'
const errorClass = 'text-xs mt-1'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 mb-6" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#f1f5f9' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function CuentaPage() {
  // Account
  const [account, setAccount] = useState<AccountData | null>(null)
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')

  const accountForm = useForm<AccountForm>({ resolver: zodResolver(accountSchema) })

  useEffect(() => {
    api.get<AccountData>('/api/v1/account/me').then(({ data }) => {
      setAccount(data)
      accountForm.reset({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        company_name: data.company_name,
      })
    }).catch(() => {})
  }, [accountForm])

  const saveAccount = async (data: AccountForm) => {
    setAccountSaving(true)
    setAccountError('')
    try {
      const { data: updated } = await api.put<AccountData>('/api/v1/account/me', data)
      setAccount(updated)
      setEditingAccount(false)
    } catch {
      setAccountError('Error al guardar. Intenta nuevamente.')
    } finally {
      setAccountSaving(false)
    }
  }

  // Billing profile
  const [billingProfile, setBillingProfile] = useState<BillingProfileData | null>(null)
  const [editingBilling, setEditingBilling] = useState(false)
  const [billingSaving, setBillingSaving] = useState(false)
  const [billingError, setBillingError] = useState('')

  const billingForm = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: { document_type: 'boleta' },
  })
  const billingDocType = billingForm.watch('document_type')
  const setBillingValue = billingForm.setValue

  useEffect(() => {
    api.get<BillingProfileData | null>('/api/v1/billing/profile').then(({ data }) => {
      if (data) {
        setBillingProfile(data)
        billingForm.reset({
          document_type: data.document_type,
          person_first_name: data.person_first_name,
          person_last_name: data.person_last_name,
          person_rut: data.person_rut,
          person_email: data.person_email,
          company_razon_social: data.company_razon_social ?? '',
          company_rut: data.company_rut ?? '',
          company_giro: data.company_giro ?? '',
          company_address: data.company_address ?? '',
        })
      }
    }).catch(() => {})
  }, [billingForm])

  const saveBilling = async (data: BillingForm) => {
    setBillingSaving(true)
    setBillingError('')
    try {
      const { data: updated } = await api.put<BillingProfileData>('/api/v1/billing/profile', data)
      setBillingProfile(updated)
      setEditingBilling(false)
    } catch {
      setBillingError('Error al guardar. Intenta nuevamente.')
    } finally {
      setBillingSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>Mi Cuenta</h1>
      <p className="text-sm mb-8" style={{ color: '#64748b' }}>Gestiona tus datos personales y de facturación</p>

      {/* Datos de la cuenta */}
      <SectionCard title="Datos de la cuenta">
        {!editingAccount ? (
          <>
            <dl className="space-y-3">
              {[
                { label: 'Nombre', value: `${account?.first_name ?? ''} ${account?.last_name ?? ''}`.trim() || '—' },
                { label: 'Email', value: account?.email ?? '—' },
                { label: 'Empresa', value: account?.company_name ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4">
                  <dt className="w-24 text-sm shrink-0" style={{ color: '#64748b' }}>{label}</dt>
                  <dd className="text-sm" style={{ color: '#f1f5f9' }}>{value}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => setEditingAccount(true)}
              className="mt-5 text-sm px-4 py-2 rounded-lg btn-ghost-cyan"
            >
              Editar datos
            </button>
          </>
        ) : (
          <form onSubmit={accountForm.handleSubmit(saveAccount)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre</label>
                <input {...accountForm.register('first_name')} className={inputClass} />
                {accountForm.formState.errors.first_name && <p className={errorClass} style={{ color: '#f87171' }}>{accountForm.formState.errors.first_name.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Apellido</label>
                <input {...accountForm.register('last_name')} className={inputClass} />
                {accountForm.formState.errors.last_name && <p className={errorClass} style={{ color: '#f87171' }}>{accountForm.formState.errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre empresa</label>
              <input {...accountForm.register('company_name')} className={inputClass} />
              {accountForm.formState.errors.company_name && <p className={errorClass} style={{ color: '#f87171' }}>{accountForm.formState.errors.company_name.message}</p>}
            </div>
            {accountError && <p className="text-sm" style={{ color: '#f87171' }}>{accountError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={accountSaving} className="btn-cyan px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {accountSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditingAccount(false)} className="text-sm px-5 py-2 rounded-lg" style={{ color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Datos de facturación */}
      <SectionCard title="Datos de facturación">
        {!billingProfile && !editingBilling ? (
          <>
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>
              Completa tus datos de facturación luego de tu primer pago.
            </p>
            <button onClick={() => setEditingBilling(true)} className="text-sm px-4 py-2 rounded-lg btn-ghost-cyan">
              Agregar datos
            </button>
          </>
        ) : !editingBilling ? (
          <>
            <dl className="space-y-3">
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Tipo</dt>
                <dd className="text-sm capitalize" style={{ color: '#f1f5f9' }}>{billingProfile?.document_type}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Nombre</dt>
                <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile?.person_first_name} {billingProfile?.person_last_name}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>RUT</dt>
                <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile?.person_rut ? formatRut(billingProfile.person_rut) : '—'}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Email</dt>
                <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile?.person_email}</dd>
              </div>
              {billingProfile?.document_type === 'factura' && (
                <>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Razón Social</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_razon_social}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>RUT empresa</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_rut ? formatRut(billingProfile.company_rut) : '—'}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Giro</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_giro}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt className="w-32 text-sm shrink-0" style={{ color: '#64748b' }}>Dirección</dt>
                    <dd className="text-sm" style={{ color: '#f1f5f9' }}>{billingProfile.company_address}</dd>
                  </div>
                </>
              )}
            </dl>
            <button onClick={() => setEditingBilling(true)} className="mt-5 text-sm px-4 py-2 rounded-lg btn-ghost-cyan">
              Editar
            </button>
          </>
        ) : (
          <form onSubmit={billingForm.handleSubmit(saveBilling)} className="space-y-4">
            <div className="flex gap-4">
              {(['boleta', 'factura'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-sm capitalize"
                  style={{ color: billingDocType === type ? '#06b6d4' : '#94a3b8' }}>
                  <input type="radio" value={type} {...billingForm.register('document_type')} className="accent-cyan-400" />
                  {type}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Nombre</label>
                <input {...billingForm.register('person_first_name')} className={inputClass} />
                {billingForm.formState.errors.person_first_name && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_first_name.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Apellido</label>
                <input {...billingForm.register('person_last_name')} className={inputClass} />
                {billingForm.formState.errors.person_last_name && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_last_name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>RUT</label>
                <input {...billingForm.register('person_rut')} onChange={(e) => setBillingValue('person_rut', formatRut(e.target.value), { shouldValidate: true })} placeholder="12.345.678-9" className={inputClass} />
                {billingForm.formState.errors.person_rut && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_rut.message}</p>}
              </div>
              <div>
                <label className={labelClass} style={{ color: '#94a3b8' }}>Email</label>
                <input {...billingForm.register('person_email')} type="email" className={inputClass} />
                {billingForm.formState.errors.person_email && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.person_email.message}</p>}
              </div>
            </div>
            {billingDocType === 'factura' && (
              <>
                <div className="pt-3 mt-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#64748b', borderTop: '1px solid rgba(6,182,212,0.1)' }}>
                  Datos empresa
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>Razón Social / Nombre de la empresa</label>
                  <input {...billingForm.register('company_razon_social')} className={inputClass} />
                  {billingForm.formState.errors.company_razon_social && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_razon_social.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} style={{ color: '#94a3b8' }}>RUT empresa</label>
                    <input {...billingForm.register('company_rut')} onChange={(e) => setBillingValue('company_rut', formatRut(e.target.value), { shouldValidate: true })} placeholder="76.543.210-K" className={inputClass} />
                    {billingForm.formState.errors.company_rut && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_rut.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: '#94a3b8' }}>Giro</label>
                    <input {...billingForm.register('company_giro')} placeholder="Desarrollo de Software" className={inputClass} />
                    {billingForm.formState.errors.company_giro && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_giro.message}</p>}
                  </div>
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#94a3b8' }}>Dirección</label>
                  <input {...billingForm.register('company_address')} placeholder="Av. Ejemplo 123, Santiago" className={inputClass} />
                  {billingForm.formState.errors.company_address && <p className={errorClass} style={{ color: '#f87171' }}>{billingForm.formState.errors.company_address.message}</p>}
                </div>
              </>
            )}
            {billingError && <p className="text-sm" style={{ color: '#f87171' }}>{billingError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={billingSaving} className="btn-cyan px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {billingSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditingBilling(false)} className="text-sm px-5 py-2 rounded-lg" style={{ color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  )
}