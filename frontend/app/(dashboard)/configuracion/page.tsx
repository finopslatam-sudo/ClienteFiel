'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TenantProfile { name: string; slug: string; timezone: string; plan: string; status: string }
interface Service { id: string; name: string; description: string | null; duration_minutes: number; price: string; is_active: boolean }
interface WhatsappStatus { connected: boolean; phone_number?: string; verified_at?: string }

// ─── Fetchers ────────────────────────────────────────────────────────────────

const fetchProfile = async (): Promise<TenantProfile> => (await api.get('/api/v1/tenant/profile')).data
const fetchServices = async (): Promise<Service[]> => (await api.get('/api/v1/services')).data
const fetchWA = async (): Promise<WhatsappStatus> => (await api.get('/api/v1/whatsapp/status')).data

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputStyle = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(6,182,212,0.15)',
  color: '#f1f5f9',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  width: '100%',
  fontSize: '0.875rem',
  outline: 'none',
}

const labelStyle = { fontSize: '0.8rem', color: '#64748b', display: 'block' as const, marginBottom: '0.3rem' }

const btnPrimary = {
  padding: '0.5rem 1.25rem',
  borderRadius: '0.5rem',
  background: 'rgba(6,182,212,0.15)',
  border: '1px solid rgba(6,182,212,0.35)',
  color: '#06b6d4',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.875rem',
}

const btnDanger = {
  padding: '0.5rem 1.25rem',
  borderRadius: '0.5rem',
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.25)',
  color: '#ef4444',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.875rem',
}

// ─── Timezones ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Buenos_Aires',
  'America/Montevideo',
  'America/Caracas',
  'America/Mexico_City',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Asuncion',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'UTC',
]

// ─── Tab: Negocio ─────────────────────────────────────────────────────────────

function TabNegocio() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['tenant-profile'], queryFn: fetchProfile })
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.patch('/api/v1/tenant/profile', { name: name || undefined, timezone: timezone || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (isLoading) return <div className="text-sm" style={{ color: '#475569' }}>Cargando...</div>
  if (!data) return null

  const currentName = name || data.name
  const currentTz = timezone || data.timezone

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="glass-card p-6 flex flex-col gap-5">

        <div>
          <label style={labelStyle}>Nombre del negocio</label>
          <input style={inputStyle} value={currentName}
            onChange={e => setName(e.target.value)} placeholder={data.name} />
        </div>

        <div>
          <label style={labelStyle}>URL pública de reservas</label>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(6,182,212,0.1)' }}>
            <span className="text-xs" style={{ color: '#475569' }}>clientefiel.riava.cl/book/</span>
            <span className="text-sm font-medium" style={{ color: '#06b6d4' }}>{data.slug}</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#334155' }}>El slug no se puede cambiar</p>
        </div>

        <div>
          <label style={labelStyle}>Zona horaria</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={currentTz}
            onChange={e => setTimezone(e.target.value)}>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label style={labelStyle}>Plan</label>
            <span className="text-sm font-semibold capitalize" style={{ color: '#06b6d4' }}>{data.plan}</span>
          </div>
          <div style={{ marginLeft: 24 }}>
            <label style={labelStyle}>Estado</label>
            <span className="text-sm font-semibold capitalize"
              style={{ color: data.status === 'active' ? '#10b981' : '#f59e0b' }}>
              {data.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button style={btnPrimary} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <span className="text-sm" style={{ color: '#10b981' }}>✓ Guardado</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Servicios ───────────────────────────────────────────────────────────

interface ServiceFormState {
  name: string; description: string; duration_minutes: string; price: string
}

const emptyForm: ServiceFormState = { name: '', description: '', duration_minutes: '60', price: '' }

function TabServicios() {
  const qc = useQueryClient()
  const { data: services = [], isLoading } = useQuery({ queryKey: ['services'], queryFn: fetchServices })
  const [form, setForm] = useState<ServiceFormState>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/v1/services', {
      name: form.name,
      description: form.description || null,
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setForm(emptyForm) },
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/services/${id}`, {
      name: form.name,
      description: form.description || null,
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setForm(emptyForm); setEditId(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })

  function startEdit(s: Service) {
    setEditId(s.id)
    setForm({ name: s.name, description: s.description ?? '', duration_minutes: String(s.duration_minutes), price: String(s.price) })
  }

  function cancelEdit() { setEditId(null); setForm(emptyForm) }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 600 }}>

      {/* Formulario */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#94a3b8' }}>
          {editId ? 'Editar servicio' : 'Agregar servicio'}
        </h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Corte de cabello" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descripción</label>
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción opcional" />
          </div>
          <div>
            <label style={labelStyle}>Duración (minutos) *</label>
            <input style={inputStyle} type="number" min={5} step={5} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Precio (CLP) *</label>
            <input style={inputStyle} type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="15000" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button style={btnPrimary}
            disabled={!form.name || !form.price || createMutation.isPending || updateMutation.isPending}
            onClick={() => editId ? updateMutation.mutate(editId) : createMutation.mutate()}>
            {editId ? 'Actualizar' : 'Agregar servicio'}
          </button>
          {editId && <button style={{ ...btnDanger, background: 'transparent' }} onClick={cancelEdit}>Cancelar</button>}
        </div>
      </div>

      {/* Lista */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
          <input style={{ ...inputStyle, width: 'auto' }} placeholder="Buscar servicio..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(15,23,42,0.4)' }} />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-sm" style={{ color: '#475569' }}>
            {search ? 'Sin resultados' : 'No hay servicios creados'}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(6,182,212,0.06)' }}>
            {filtered.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{s.name}</div>
                  <div className="text-xs mt-0.5 flex gap-3" style={{ color: '#475569' }}>
                    <span>{s.duration_minutes} min</span>
                    <span>${Number(s.price).toLocaleString('es-CL')}</span>
                    {s.description && <span className="truncate max-w-40">{s.description}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(s)} className="text-xs px-2.5 py-1 rounded-md"
                    style={{ border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4', background: 'transparent', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => deleteMutation.mutate(s.id)} className="text-xs px-2.5 py-1 rounded-md"
                    style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', background: 'transparent', cursor: 'pointer' }}>
                    Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: WhatsApp ────────────────────────────────────────────────────────────

function TabWhatsapp() {
  const { data, isLoading } = useQuery({ queryKey: ['wa-status'], queryFn: fetchWA })
  const qc = useQueryClient()

  const disconnect = useMutation({
    mutationFn: () => api.post('/api/v1/whatsapp/disconnect'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-status'] }),
  })

  if (isLoading) return <div className="text-sm" style={{ color: '#475569' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="glass-card p-6">
        {data?.connected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                ✓
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#10b981' }}>WhatsApp conectado</div>
                <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{data.phone_number}</div>
              </div>
            </div>
            {data.verified_at && (
              <p className="text-xs" style={{ color: '#334155' }}>
                Verificado: {new Date(data.verified_at).toLocaleDateString('es-CL')}
              </p>
            )}
            <div className="p-4 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#94a3b8' }}>
              Para cambiar el número conectado, primero desconecta el actual y luego conecta el nuevo desde la sección WhatsApp del menú.
            </div>
            <button style={btnDanger} onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                ✕
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#ef4444' }}>WhatsApp no conectado</div>
                <div className="text-xs mt-0.5" style={{ color: '#475569' }}>Los recordatorios no se enviarán</div>
              </div>
            </div>
            <div className="p-4 rounded-lg text-sm" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)', color: '#94a3b8', lineHeight: 1.6 }}>
              Para conectar tu WhatsApp Business, ve a la sección <strong style={{ color: '#06b6d4' }}>WhatsApp</strong> en el menú lateral y sigue el proceso de autorización con Meta.
            </div>
          </div>
        )}
      </div>

      {/* Info de templates */}
      <div className="glass-card p-5 mt-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>Templates requeridos en Meta</h3>
        <div className="flex flex-col gap-2">
          {[
            { name: 'booking_confirmation', desc: 'Confirmación de reserva' },
            { name: 'reminder_24h', desc: 'Recordatorio 24 horas antes' },
            { name: 'reminder_1h', desc: 'Recordatorio 1 hora antes' },
          ].map(t => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)' }}>
                {t.name}
              </span>
              <span className="text-xs" style={{ color: '#475569' }}>{t.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: '#334155' }}>
          Estos templates deben estar aprobados en tu Meta Business Manager antes de que los mensajes se envíen.
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'negocio' | 'servicios' | 'whatsapp'

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>('negocio')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'negocio', label: 'Negocio' },
    { key: 'servicios', label: 'Servicios' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#f1f5f9' }}>Configuración</h1>

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
        style={{ background: 'rgba(15,23,42,0.4)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: tab === t.key ? 'rgba(6,182,212,0.15)' : 'transparent',
              color: tab === t.key ? '#06b6d4' : '#94a3b8',
              border: tab === t.key ? '1px solid rgba(6,182,212,0.25)' : '1px solid transparent',
              cursor: 'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'negocio' && <TabNegocio />}
      {tab === 'servicios' && <TabServicios />}
      {tab === 'whatsapp' && <TabWhatsapp />}
    </div>
  )
}
