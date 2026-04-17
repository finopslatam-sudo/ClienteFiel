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

    const W = 680
    const H = 360
    canvas.width = W
    canvas.height = H

    // Draw text with manual letter spacing
    const drawSpaced = (text: string, x: number, y: number, gap: number) => {
      let cx = x
      for (const ch of text) {
        ctx.fillText(ch, cx, y)
        cx += ctx.measureText(ch).width + gap
      }
    }

    // Rose illustration (cx, cy = center, r = radius, alpha = opacity)
    const drawRose = (cx: number, cy: number, r: number, alpha: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.globalAlpha = alpha

      // Leaves
      for (let i = 0; i < 2; i++) {
        ctx.save()
        ctx.rotate(i === 0 ? Math.PI * 0.72 : Math.PI * 1.28)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(r * 0.28, -r * 0.1, r * 0.42, -r * 0.48, 0, -r * 0.58)
        ctx.bezierCurveTo(-r * 0.38, -r * 0.48, -r * 0.22, -r * 0.1, 0, 0)
        const lg = ctx.createLinearGradient(0, -r * 0.58, 0, 0)
        lg.addColorStop(0, '#3a8040')
        lg.addColorStop(1, '#1e4a22')
        ctx.fillStyle = lg
        ctx.fill()
        ctx.restore()
      }

      // Outer petals (6)
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.rotate((Math.PI * 2 / 6) * i)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(-r * 0.28, -r * 0.18, -r * 0.24, -r * 0.84, 0, -r * 0.97)
        ctx.bezierCurveTo(r * 0.24, -r * 0.84, r * 0.28, -r * 0.18, 0, 0)
        const pg = ctx.createLinearGradient(0, -r * 0.97, 0, 0)
        pg.addColorStop(0, '#ffb0c4')
        pg.addColorStop(0.5, '#d4526e')
        pg.addColorStop(1, '#8a1a30')
        ctx.fillStyle = pg
        ctx.fill()
        ctx.restore()
      }

      // Mid petals (5, offset)
      for (let i = 0; i < 5; i++) {
        ctx.save()
        ctx.rotate((Math.PI * 2 / 5) * i + 0.32)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(-r * 0.2, -r * 0.1, -r * 0.16, -r * 0.62, 0, -r * 0.7)
        ctx.bezierCurveTo(r * 0.16, -r * 0.62, r * 0.2, -r * 0.1, 0, 0)
        const pg = ctx.createLinearGradient(0, -r * 0.7, 0, 0)
        pg.addColorStop(0, '#ffc8d5')
        pg.addColorStop(0.6, '#e06080')
        pg.addColorStop(1, '#a02040')
        ctx.fillStyle = pg
        ctx.fill()
        ctx.restore()
      }

      // Inner petals (4)
      for (let i = 0; i < 4; i++) {
        ctx.save()
        ctx.rotate((Math.PI * 2 / 4) * i + 0.85)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(-r * 0.13, -r * 0.07, -r * 0.11, -r * 0.38, 0, -r * 0.44)
        ctx.bezierCurveTo(r * 0.11, -r * 0.38, r * 0.13, -r * 0.07, 0, 0)
        ctx.fillStyle = '#f5c0cf'
        ctx.fill()
        ctx.restore()
      }

      // Center bud
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2)
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.13)
      cg.addColorStop(0, '#ffe0e8')
      cg.addColorStop(1, '#b82848')
      ctx.fillStyle = cg
      ctx.fill()

      ctx.globalAlpha = 1
      ctx.restore()
    }

    // L-shaped corner ornament
    const drawCorner = (x: number, y: number, dx: number, dy: number) => {
      const s = 20
      ctx.strokeStyle = 'rgba(201,168,76,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + dx * s, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + dy * s)
      ctx.stroke()
    }

    // ── BACKGROUND ──────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#09101e')
    bg.addColorStop(0.45, '#0d1422')
    bg.addColorStop(1, '#0f0916')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // Rose glow (upper-right)
    const rGlow = ctx.createRadialGradient(W - 108, H / 2, 0, W - 108, H / 2, 220)
    rGlow.addColorStop(0, 'rgba(212,82,110,0.09)')
    rGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = rGlow
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // Gold glow (lower-left)
    const gGlow = ctx.createRadialGradient(0, H, 0, 0, H, 260)
    gGlow.addColorStop(0, 'rgba(201,168,76,0.06)')
    gGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = gGlow
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // ── SUBTLE DIAGONAL MESH ────────────────────────────────────
    ctx.save()
    ctx.globalAlpha = 0.022
    ctx.strokeStyle = '#c9a84c'
    ctx.lineWidth = 0.5
    for (let i = -H; i < W + H; i += 28) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + H, H)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()

    // ── GOLD BORDER ─────────────────────────────────────────────
    const border = ctx.createLinearGradient(0, 0, W, H)
    border.addColorStop(0, 'rgba(201,168,76,0.7)')
    border.addColorStop(0.5, 'rgba(232,201,122,0.28)')
    border.addColorStop(1, 'rgba(201,168,76,0.65)')
    ctx.strokeStyle = border
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(1, 1, W - 2, H - 2, 19)
    ctx.stroke()

    // ── LEFT ACCENT STRIPE ──────────────────────────────────────
    const stripe = ctx.createLinearGradient(0, 0, 0, H)
    stripe.addColorStop(0, '#d4526e')
    stripe.addColorStop(0.5, '#c9a84c')
    stripe.addColorStop(1, '#8a1a30')
    ctx.fillStyle = stripe
    ctx.beginPath()
    ctx.roundRect(0, 0, 5, H, [20, 0, 0, 20])
    ctx.fill()

    // ── ROSE ────────────────────────────────────────────────────
    drawRose(W - 108, H / 2 - 8, 130, 0.09)   // large watermark
    drawRose(W - 108, H / 2 - 8, 74, 0.6)     // main rose

    // ── HEADER ──────────────────────────────────────────────────
    const nameGrad = ctx.createLinearGradient(40, 0, 360, 0)
    nameGrad.addColorStop(0, '#e8c97a')
    nameGrad.addColorStop(1, '#c9a84c')
    ctx.fillStyle = nameGrad
    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    drawSpaced(businessName.toUpperCase(), 40, 52, 2.5)

    ctx.fillStyle = 'rgba(201,168,76,0.45)'
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText('✦  G I F T   C A R D  ✦', 40, 74)

    // Header separator line
    const hLine = ctx.createLinearGradient(40, 0, 400, 0)
    hLine.addColorStop(0, 'rgba(201,168,76,0.4)')
    hLine.addColorStop(1, 'transparent')
    ctx.strokeStyle = hLine
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(40, 88)
    ctx.lineTo(400, 88)
    ctx.stroke()

    // ── OFFER TEXT ──────────────────────────────────────────────
    const offerText = cardType === 'discount'
      ? `${discountPercent}% OFF`
      : freeService || 'Servicio Gratis'

    const fontSize = offerText.length > 14 ? 44 : offerText.length > 9 ? 56 : 70
    ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

    const offerGrad = ctx.createLinearGradient(40, 105, 440, 220)
    offerGrad.addColorStop(0, '#f5ede0')
    offerGrad.addColorStop(0.3, '#e8c97a')
    offerGrad.addColorStop(0.7, '#d4526e')
    offerGrad.addColorStop(1, '#a01838')
    ctx.fillStyle = offerGrad
    ctx.fillText(offerText, 40, 196, W - 240)

    if (cardType === 'discount') {
      ctx.font = '400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillStyle = 'rgba(201,168,76,0.5)'
      ctx.fillText('en tu próxima visita', 42, 222)
    }

    // ── BOTTOM AREA ─────────────────────────────────────────────
    const bLine = ctx.createLinearGradient(40, 0, W - 160, 0)
    bLine.addColorStop(0, 'transparent')
    bLine.addColorStop(0.08, 'rgba(201,168,76,0.38)')
    bLine.addColorStop(0.9, 'rgba(201,168,76,0.18)')
    bLine.addColorStop(1, 'transparent')
    ctx.strokeStyle = bLine
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(40, H - 52)
    ctx.lineTo(W - 160, H - 52)
    ctx.stroke()

    // Diamond ornament on separator
    ctx.save()
    ctx.translate(220, H - 52)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = 'rgba(201,168,76,0.5)'
    ctx.fillRect(-2.5, -2.5, 5, 5)
    ctx.restore()

    // Expiry / promo text
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    if (expiryDate) {
      ctx.fillStyle = 'rgba(201,168,76,0.5)'
      ctx.fillText(
        `Válida hasta: ${new Date(expiryDate + 'T00:00:00').toLocaleDateString('es-CL')}`,
        40, H - 30
      )
    } else {
      ctx.fillStyle = 'rgba(148,126,100,0.32)'
      ctx.fillText('Exclusivo · Sin fecha de expiración', 40, H - 30)
    }

    // ── CORNER ORNAMENTS ────────────────────────────────────────
    drawCorner(16, 16, 1, 1)
    drawCorner(W - 16, 16, -1, 1)
    drawCorner(16, H - 16, 1, -1)
    drawCorner(W - 16, H - 16, -1, -1)

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

        <div>
          <p className="text-xs mb-2" style={{ color: '#475569' }}>Vista previa</p>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              borderRadius: '12px',
              border: '1px solid rgba(201,168,76,0.12)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
