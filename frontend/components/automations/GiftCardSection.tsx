'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface TenantInfo {
  name: string
}

type GiftCardType = 'discount' | 'free_service'

export function GiftCardSection({ plan }: { plan: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isLocked = plan !== 'premium'

  const [cardType, setCardType] = useState<GiftCardType>('discount')
  const [discountPercent, setDiscountPercent] = useState(20)
  const [freeService, setFreeService] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  const { data: tenant } = useQuery<TenantInfo>({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/tenant/profile')
      return data
    },
  })

  const businessName = tenant?.name ?? 'Tu Negocio'

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 600
    const H = 320
    canvas.width = W
    canvas.height = H

    // Fondo degradado
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#0c0f1f')
    grad.addColorStop(0.5, '#0d1a2e')
    grad.addColorStop(1, '#150b2e')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 16)
    ctx.fill()

    // Borde violeta
    ctx.strokeStyle = 'rgba(167,139,250,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(1, 1, W - 2, H - 2, 15)
    ctx.stroke()

    // Círculo decorativo fondo
    ctx.beginPath()
    ctx.arc(W - 60, 60, 120, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(167,139,250,0.06)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(60, H - 40, 80, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(6,182,212,0.05)'
    ctx.fill()

    // Nombre del negocio
    ctx.font = 'bold 18px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(businessName.toUpperCase(), 36, 52)

    // GIFT CARD label
    ctx.font = '600 11px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(167,139,250,0.7)'
    ctx.fillText('GIFT CARD', 36, 78)

    // Oferta principal
    const offerText = cardType === 'discount'
      ? `${discountPercent}% OFF`
      : freeService || 'Servicio Gratis'
    const gradient2 = ctx.createLinearGradient(0, 100, W, 200)
    gradient2.addColorStop(0, '#a78bfa')
    gradient2.addColorStop(1, '#06b6d4')
    ctx.fillStyle = gradient2
    ctx.font = 'bold 62px -apple-system, system-ui, sans-serif'
    ctx.fillText(offerText, 36, 175)

    // Subtítulo
    if (cardType === 'discount') {
      ctx.font = '16px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText('en tu próxima visita', 36, 205)
    }

    // Fecha de expiración
    if (expiryDate) {
      ctx.font = '13px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = '#475569'
      ctx.fillText(`Válida hasta: ${new Date(expiryDate + 'T00:00:00').toLocaleDateString('es-CL')}`, 36, H - 36)
    }

    // Línea inferior decorativa
    const lineGrad = ctx.createLinearGradient(36, 0, W - 36, 0)
    lineGrad.addColorStop(0, 'rgba(167,139,250,0.5)')
    lineGrad.addColorStop(1, 'rgba(6,182,212,0.3)')
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(36, H - 50)
    ctx.lineTo(W - 36, H - 50)
    ctx.stroke()
  }, [businessName, cardType, discountPercent, freeService, expiryDate])

  useEffect(() => {
    if (!isLocked) drawCard()
  }, [isLocked, drawCard])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `giftcard-${businessName.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div
      className="glass-card p-6"
      style={{ border: '1px solid rgba(167,139,250,0.2)', position: 'relative' }}
    >
      {isLocked && (
        <div
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: 'rgba(2,11,20,0.85)', backdropFilter: 'blur(2px)' }}
        >
          <span className="text-2xl">🔒</span>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Requiere Plan Premium</p>
          <a
            href="/suscripcion"
            className="text-xs px-4 py-2 rounded-lg font-semibold"
            style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            Actualizar plan
          </a>
        </div>
      )}

      <div className="mb-5">
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Generador de GiftCard</h2>
        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
          Crea una imagen para compartir por WhatsApp
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Controles */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#94a3b8' }}>Tipo de oferta</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCardType('discount')}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={cardType === 'discount'
                  ? { background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' }
                  : { color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }
                }
              >
                % Descuento
              </button>
              <button
                onClick={() => setCardType('free_service')}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={cardType === 'free_service'
                  ? { background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' }
                  : { color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }
                }
              >
                Servicio gratis
              </button>
            </div>
          </div>

          {cardType === 'discount' ? (
            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
                Porcentaje de descuento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="input-dark w-24 px-3 py-2 text-sm"
                />
                <span className="text-sm" style={{ color: '#64748b' }}>%</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
                Nombre del servicio gratis
              </label>
              <input
                type="text"
                value={freeService}
                onChange={e => setFreeService(e.target.value)}
                placeholder="Ej: Corte de pelo"
                className="input-dark w-full px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
              Fecha de expiración (opcional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="input-dark px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={isLocked}
            className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)' }}
          >
            Descargar PNG
          </button>
        </div>

        {/* Preview */}
        <div>
          <p className="text-xs mb-2" style={{ color: '#475569' }}>Vista previa</p>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              borderRadius: '12px',
              border: '1px solid rgba(167,139,250,0.15)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
