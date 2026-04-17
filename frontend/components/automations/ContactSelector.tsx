// frontend/components/automations/ContactSelector.tsx
'use client'
import { useState, useRef, useEffect } from 'react'

export interface CustomerOption {
  id: string
  name: string | null
  phone_number: string
}

interface ContactSelectorProps {
  value: string[]
  onChange: (ids: string[]) => void
  customers: CustomerOption[]
  accentColor?: string
}

export function ContactSelector({
  value,
  onChange,
  customers,
  accentColor = '#06b6d4',
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (c.name ?? '').toLowerCase().includes(q) || c.phone_number.includes(q)
  })

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])

  const accentBg = `${accentColor}14`
  const accentBorder = `${accentColor}33`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input-dark w-full px-3 py-2 text-sm text-left flex justify-between items-center"
      >
        <span style={{ color: value.length ? '#e2e8f0' : '#475569' }}>
          {value.length === 0
            ? 'Todos los clientes'
            : `${value.length} contacto${value.length !== 1 ? 's' : ''} seleccionado${value.length !== 1 ? 's' : ''}`}
        </span>
        <span style={{ color: '#64748b', fontSize: '10px' }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg overflow-hidden"
          style={{
            background: '#0a1628',
            border: `1px solid ${accentBorder}`,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          <div
            className="p-2 sticky top-0"
            style={{ background: '#0a1628', borderBottom: '1px solid rgba(6,182,212,0.1)' }}
          >
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="input-dark w-full px-2 py-1.5 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => { onChange([]); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
            style={{
              color: value.length === 0 ? accentColor : '#94a3b8',
              background: value.length === 0 ? accentBg : 'transparent',
            }}
          >
            <span style={{ width: '14px', textAlign: 'center' }}>
              {value.length === 0 ? '✓' : ''}
            </span>
            <span>Todos los clientes</span>
          </button>

          {filtered.map(c => {
            const selected = value.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                style={{
                  color: selected ? accentColor : '#94a3b8',
                  background: selected ? accentBg : 'transparent',
                }}
              >
                <span style={{ width: '14px', textAlign: 'center', fontSize: '12px' }}>
                  {selected ? '✓' : ''}
                </span>
                <span className="flex-1 truncate">{c.name || c.phone_number}</span>
                {c.name && (
                  <span className="text-xs flex-shrink-0" style={{ color: '#475569' }}>
                    {c.phone_number}
                  </span>
                )}
              </button>
            )
          })}

          {filtered.length === 0 && search && (
            <p className="text-xs text-center py-3" style={{ color: '#475569' }}>
              Sin resultados
            </p>
          )}
        </div>
      )}
    </div>
  )
}
