// frontend/components/availability/WeeklySchedule.tsx
'use client'
import { useState, useEffect } from 'react'
import { useAvailabilityRules, useUpsertRules } from '@/lib/hooks/useAvailability'
import { AvailabilityRuleInput } from '@/lib/api/availability'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SLOT_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 75, label: '1 hora 15 min' },
  { value: 90, label: '1 hora 30 min' },
  { value: 105, label: '1 hora 45 min' },
  { value: 120, label: '2 horas' },
]
const BUFFER_OPTIONS = [0, 5, 10, 15, 30]

interface DayConfig {
  enabled: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
}

const DEFAULT_DAY: DayConfig = {
  enabled: false,
  start_time: '09:00',
  end_time: '18:00',
  slot_duration_minutes: 30,
  buffer_minutes: 0,
}

function toApiTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

function fromApiTime(t: string): string {
  return t.slice(0, 5)
}

export function WeeklySchedule() {
  const { data, isLoading } = useAvailabilityRules()
  const upsert = useUpsertRules()
  const [days, setDays] = useState<DayConfig[]>(
    Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }))
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    setDays(prev =>
      prev.map((d, i) => {
        const rule = data.rules.find(r => r.day_of_week === i)
        if (!rule) return d
        return {
          enabled: rule.is_active,
          start_time: fromApiTime(rule.start_time),
          end_time: fromApiTime(rule.end_time),
          slot_duration_minutes: rule.slot_duration_minutes,
          buffer_minutes: rule.buffer_minutes,
        }
      })
    )
  }, [data])

  function updateDay(index: number, patch: Partial<DayConfig>) {
    setDays(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  async function handleSave() {
    const indexedRules: AvailabilityRuleInput[] = days
      .map((d, i) => ({
        day_of_week: i,
        start_time: toApiTime(d.start_time),
        end_time: toApiTime(d.end_time),
        slot_duration_minutes: d.slot_duration_minutes,
        buffer_minutes: d.buffer_minutes,
        is_active: d.enabled,
        timezone: 'America/Santiago',
      }))
      .filter(r => r.is_active)

    await upsert.mutateAsync(indexedRules)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) {
    return <div className="text-sm" style={{ color: '#94a3b8' }}>Cargando horarios...</div>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
        Configura los días y horarios en que recibirás reservas. Timezone: America/Santiago.
      </p>

      {/* Column headers */}
      <div className="hidden sm:grid px-4" style={{ gridTemplateColumns: '160px 1fr 1fr 1fr' }}>
        <span />
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>Horario</span>
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>Duración del servicio</span>
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>Tiempo entre citas</span>
      </div>

      {days.map((day, i) => (
        <div
          key={i}
          className="glass-card p-4"
          style={{ opacity: day.enabled ? 1 : 0.6, transition: 'opacity 0.2s' }}
        >
          {/* Desktop: grid row */}
          <div className="hidden sm:grid items-center gap-4" style={{ gridTemplateColumns: '160px 1fr 1fr 1fr' }}>
            {/* Toggle + day name */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateDay(i, { enabled: !day.enabled })}
                className="flex-shrink-0 w-11 h-6 rounded-full relative overflow-hidden transition-colors"
                style={{
                  background: day.enabled ? 'rgba(6,182,212,0.8)' : 'rgba(100,116,139,0.3)',
                }}
              >
                <span
                  className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: day.enabled ? 'translateX(18px)' : 'translateX(0px)' }}
                />
              </button>
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#f1f5f9' }}>
                {DAY_NAMES[i]}
              </span>
            </div>

            {/* Time range */}
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={day.start_time}
                disabled={!day.enabled}
                onChange={e => updateDay(i, { start_time: e.target.value })}
                className="text-sm px-2 py-1 rounded-lg w-full max-w-[110px]"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
              />
              <span style={{ color: '#94a3b8' }}>–</span>
              <input
                type="time"
                value={day.end_time}
                disabled={!day.enabled}
                onChange={e => updateDay(i, { end_time: e.target.value })}
                className="text-sm px-2 py-1 rounded-lg w-full max-w-[110px]"
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  color: '#f1f5f9',
                }}
              />
            </div>

            {/* Slot duration */}
            <select
              value={day.slot_duration_minutes}
              disabled={!day.enabled}
              onChange={e => updateDay(i, { slot_duration_minutes: Number(e.target.value) })}
              className="text-sm px-2 py-1 rounded-lg w-full max-w-[160px]"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(6,182,212,0.15)',
                color: '#f1f5f9',
              }}
            >
              {SLOT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Buffer */}
            <select
              value={day.buffer_minutes}
              disabled={!day.enabled}
              onChange={e => updateDay(i, { buffer_minutes: Number(e.target.value) })}
              className="text-sm px-2 py-1 rounded-lg w-full max-w-[140px]"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(6,182,212,0.15)',
                color: '#f1f5f9',
              }}
            >
              {BUFFER_OPTIONS.map(v => (
                <option key={v} value={v}>{v === 0 ? 'Sin pausa' : `${v} min`}</option>
              ))}
            </select>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateDay(i, { enabled: !day.enabled })}
                className="flex-shrink-0 w-11 h-6 rounded-full relative overflow-hidden transition-colors"
                style={{
                  background: day.enabled ? 'rgba(6,182,212,0.8)' : 'rgba(100,116,139,0.3)',
                }}
              >
                <span
                  className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: day.enabled ? 'translateX(18px)' : 'translateX(0px)' }}
                />
              </button>
              <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{DAY_NAMES[i]}</span>
            </div>
            {day.enabled && (
              <div className="flex flex-col gap-2 pl-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-24" style={{ color: '#64748b' }}>Horario</span>
                  <div className="flex items-center gap-2">
                    <input type="time" value={day.start_time} onChange={e => updateDay(i, { start_time: e.target.value })}
                      className="text-sm px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(6,182,212,0.15)', color: '#f1f5f9' }} />
                    <span style={{ color: '#94a3b8' }}>–</span>
                    <input type="time" value={day.end_time} onChange={e => updateDay(i, { end_time: e.target.value })}
                      className="text-sm px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(6,182,212,0.15)', color: '#f1f5f9' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-24" style={{ color: '#64748b' }}>Duración</span>
                  <select value={day.slot_duration_minutes} onChange={e => updateDay(i, { slot_duration_minutes: Number(e.target.value) })}
                    className="text-sm px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(6,182,212,0.15)', color: '#f1f5f9' }}>
                    {SLOT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-24" style={{ color: '#64748b' }}>Entre citas</span>
                  <select value={day.buffer_minutes} onChange={e => updateDay(i, { buffer_minutes: Number(e.target.value) })}
                    className="text-sm px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(6,182,212,0.15)', color: '#f1f5f9' }}>
                    {BUFFER_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? 'Sin pausa' : `${v} min`}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={upsert.isPending}
        className="mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(6,182,212,0.15)',
          border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(6,182,212,0.3)'}`,
          color: saved ? '#10b981' : '#06b6d4',
        }}
      >
        {upsert.isPending ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar horarios'}
      </button>
    </div>
  )
}
