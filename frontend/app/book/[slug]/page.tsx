'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'

const API = process.env.NEXT_PUBLIC_API_URL

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
}

interface Slot {
  start: string
  end: string
}

async function fetchPage(slug: string) {
  const res = await fetch(`${API}/api/v1/public/${slug}`)
  if (!res.ok) throw new Error('Página no encontrada')
  return res.json() as Promise<{ tenant: { name: string; slug: string }; services: Service[] }>
}

async function fetchSlots(slug: string, date: string, serviceId: string): Promise<Slot[]> {
  const res = await fetch(`${API}/api/v1/public/${slug}/slots?date=${date}&service_id=${serviceId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.slots ?? []
}

async function createBooking(slug: string, body: object) {
  const res = await fetch(`${API}/api/v1/public/${slug}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al agendar')
  }
  return res.json()
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

const inputStyle = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(6,182,212,0.2)',
  color: '#f1f5f9',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  width: '100%',
  fontSize: '0.875rem',
}

const btnStyle = (active: boolean) => ({
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  border: `1px solid ${active ? 'rgba(6,182,212,0.6)' : 'rgba(100,116,139,0.2)'}`,
  background: active ? 'rgba(6,182,212,0.15)' : 'transparent',
  color: active ? '#06b6d4' : '#94a3b8',
  cursor: 'pointer',
  fontSize: '0.875rem',
  transition: 'all 0.15s',
})

export default function BookPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep] = useState<'service' | 'datetime' | 'form' | 'done'>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-page', slug],
    queryFn: () => fetchPage(slug),
  })

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['public-slots', slug, selectedDate, selectedService?.id],
    queryFn: () => fetchSlots(slug, selectedDate, selectedService!.id),
    enabled: step === 'datetime' && !!selectedService,
  })

  const mutation = useMutation({
    mutationFn: () => createBooking(slug, {
      service_id: selectedService!.id,
      scheduled_at: selectedSlot!.start,
      customer_phone: phone,
      customer_name: name || null,
    }),
    onSuccess: () => setStep('done'),
    onError: (e: Error) => setError(e.message),
  })

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <p style={{ color: '#94a3b8' }}>Cargando...</p>
    </div>
  )

  if (isError || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <p style={{ color: '#ef4444' }}>Página no encontrada</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 1rem',
            background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: '#06b6d4',
          }}>
            {data.tenant.name.slice(0, 2).toUpperCase()}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            {data.tenant.name}
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Reserva tu hora en línea
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['service', 'datetime', 'form'] as const).map((s, i) => (
            <div key={s} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: ['service', 'datetime', 'form', 'done'].indexOf(step) >= i
                ? '#06b6d4' : 'rgba(100,116,139,0.2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step 1: Elegir servicio */}
        {step === 'service' && (
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>
              ¿Qué servicio necesitas?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep('datetime') }}
                  style={{
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem' }}>{s.name}</span>
                    {s.price != null && (
                      <span style={{ color: '#06b6d4', fontWeight: 600, fontSize: '0.875rem' }}>
                        ${s.price.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.duration_minutes} min</span>
                    {s.description && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Elegir fecha y hora */}
        {step === 'datetime' && selectedService && (
          <div>
            <button onClick={() => setStep('service')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}>
              ← Cambiar servicio
            </button>
            <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
              <span style={{ color: '#06b6d4', fontWeight: 600 }}>{selectedService.name}</span>
              <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{selectedService.duration_minutes} min</span>
            </div>

            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#94a3b8' }}>
              Selecciona una fecha
            </h2>
            <input
              type="date"
              value={selectedDate}
              min={todayStr()}
              onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null) }}
              style={{ ...inputStyle, marginBottom: '1.25rem', cursor: 'pointer' }}
            />

            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#94a3b8' }}>
              {formatDate(selectedDate)}
            </h2>

            {loadingSlots ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando horarios...</p>
            ) : slots.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No hay horas disponibles para este día.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {slots.map(slot => (
                  <button
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    style={btnStyle(selectedSlot?.start === slot.start)}
                  >
                    {formatTime(slot.start)}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <button
                onClick={() => setStep('form')}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                  background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)',
                  color: '#06b6d4', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* Step 3: Datos del cliente */}
        {step === 'form' && selectedService && selectedSlot && (
          <div>
            <button onClick={() => setStep('datetime')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}>
              ← Cambiar hora
            </button>

            <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ color: '#06b6d4', fontWeight: 600 }}>{selectedService.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                {formatDate(selectedDate)} · {formatTime(selectedSlot.start)}
              </div>
            </div>

            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>
              Tus datos
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>
                  WhatsApp <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>
            )}

            <button
              onClick={() => { setError(''); mutation.mutate() }}
              disabled={mutation.isPending || !phone.trim()}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                background: mutation.isPending || !phone.trim() ? 'rgba(100,116,139,0.1)' : 'rgba(6,182,212,0.15)',
                border: `1px solid ${mutation.isPending || !phone.trim() ? 'rgba(100,116,139,0.2)' : 'rgba(6,182,212,0.4)'}`,
                color: mutation.isPending || !phone.trim() ? '#64748b' : '#06b6d4',
                fontWeight: 600, cursor: mutation.isPending || !phone.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {mutation.isPending ? 'Agendando...' : 'Confirmar reserva'}
            </button>
          </div>
        )}

        {/* Step 4: Confirmado */}
        {step === 'done' && selectedService && selectedSlot && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.5rem',
              background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem',
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
              ¡Reserva confirmada!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Te enviaremos un recordatorio por WhatsApp
            </p>
            <div style={{
              background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '0.75rem', padding: '1rem', textAlign: 'left',
            }}>
              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{selectedService.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {formatDate(selectedDate)} · {formatTime(selectedSlot.start)}
              </div>
              {name && <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{name}</div>}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.75rem', marginTop: '3rem' }}>
          Powered by Cliente Fiel
        </p>
      </div>
    </div>
  )
}
