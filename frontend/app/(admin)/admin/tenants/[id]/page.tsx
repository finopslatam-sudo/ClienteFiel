// frontend/app/(admin)/admin/tenants/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import adminApi from '@/lib/adminApi'

interface UserInfo {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface BillingInfo {
  document_type: string
  person_first_name: string
  person_last_name: string
  person_email: string
  person_rut: string
  company_name: string | null
  company_razon_social: string | null
  company_rut: string | null
  company_giro: string | null
  company_address: string | null
}

interface WhatsAppInfo {
  phone_number: string
  phone_number_id: string
  meta_waba_id: string | null
  is_active: boolean
  verified_at: string | null
  token_expires_at: string | null
}

interface TenantDetail {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  trial_ends_at: string | null
  created_at: string
  subscription: { plan: string; status: string; provider: string; external_subscription_id: string | null } | null
  users: UserInfo[]
  billing: BillingInfo | null
  whatsapp: WhatsAppInfo | null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 mb-4" style={{ border: '1px solid rgba(6,182,212,0.1)' }}>
      <h2 className="text-xs font-bold tracking-widest mb-4" style={{ color: '#64748b' }}>{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}>
      <span className="text-sm" style={{ color: '#64748b' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{value ?? '—'}</span>
    </div>
  )
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.get<TenantDetail>(`/api/v1/admin/tenants/${id}`)
      .then(({ data }) => setTenant(data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <AdminShell><p style={{ color: '#475569' }}>Cargando...</p></AdminShell>
  if (!tenant) return <AdminShell><p style={{ color: '#ef4444' }}>Tenant no encontrado.</p></AdminShell>

  return (
    <AdminShell>
      <button
        onClick={() => router.back()}
        className="text-sm mb-5 flex items-center gap-1"
        style={{ color: '#475569' }}
      >
        ← Volver
      </button>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>{tenant.name}</h1>
      <p className="text-xs mb-6" style={{ color: '#475569' }}>{tenant.slug}</p>

      <Section title="SUSCRIPCIÓN">
        <Row label="Plan" value={tenant.plan} />
        <Row label="Estado" value={tenant.status} />
        {tenant.subscription && (
          <>
            <Row label="Proveedor" value={tenant.subscription.provider} />
            <Row label="ID externo" value={tenant.subscription.external_subscription_id} />
          </>
        )}
        <Row label="Trial vence" value={tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString('es-CL') : null} />
        <Row label="Registro" value={new Date(tenant.created_at).toLocaleDateString('es-CL')} />
      </Section>

      <Section title="USUARIOS">
        {tenant.users.length === 0 ? (
          <p className="text-sm" style={{ color: '#475569' }}>Sin usuarios</p>
        ) : (
          tenant.users.map((u) => (
            <div key={u.id} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}>
              <div>
                <span className="text-sm" style={{ color: '#f1f5f9' }}>
                  {u.first_name} {u.last_name}
                </span>
                <span className="text-xs ml-2" style={{ color: '#475569' }}>{u.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#64748b' }}>{u.role}</span>
                <span className="text-xs" style={{ color: u.is_active ? '#10b981' : '#ef4444' }}>
                  {u.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))
        )}
      </Section>

      {tenant.billing && (
        <Section title="FACTURACIÓN">
          <Row label="Tipo" value={tenant.billing.document_type} />
          <Row label="Nombre" value={`${tenant.billing.person_first_name} ${tenant.billing.person_last_name}`} />
          <Row label="RUT" value={tenant.billing.person_rut} />
          <Row label="Email" value={tenant.billing.person_email} />
          {tenant.billing.company_razon_social && (
            <>
              <Row label="Razón social" value={tenant.billing.company_razon_social} />
              <Row label="RUT empresa" value={tenant.billing.company_rut} />
              <Row label="Giro" value={tenant.billing.company_giro} />
              <Row label="Dirección" value={tenant.billing.company_address} />
            </>
          )}
        </Section>
      )}

      {tenant.whatsapp && (
        <Section title="WHATSAPP">
          <Row label="Número" value={tenant.whatsapp.phone_number} />
          <Row label="Phone Number ID" value={tenant.whatsapp.phone_number_id} />
          <Row label="WABA ID" value={tenant.whatsapp.meta_waba_id} />
          <Row label="Activo" value={tenant.whatsapp.is_active ? 'Sí' : 'No'} />
          <Row label="Verificado" value={tenant.whatsapp.verified_at ? new Date(tenant.whatsapp.verified_at).toLocaleDateString('es-CL') : null} />
          <Row label="Token vence" value={tenant.whatsapp.token_expires_at ? new Date(tenant.whatsapp.token_expires_at).toLocaleDateString('es-CL') : null} />
        </Section>
      )}
    </AdminShell>
  )
}
