// frontend/components/sections/Hero.tsx
'use client'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { useCountUp } from '@/hooks/useCountUp'

interface StatItemProps {
  end: number
  suffix: string
  prefix?: string
  label: string
}

function StatItem({ end, suffix, prefix = '', label }: StatItemProps) {
  const { ref, value } = useCountUp(end)
  return (
    <div ref={ref} className="text-center px-4 py-2">
      <div className="text-3xl font-bold text-glow-cyan">
        {prefix}{value}{suffix}
      </div>
      <div className="text-sm mt-1" style={{ color: '#94a3b8' }}>{label}</div>
    </div>
  )
}

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.currentTime = 0.5
    v.play().catch(() => {/* autoplay blocked */})
  }, [])

  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      {/* Cyber Grid */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" style={{ zIndex: 0 }} />
      {/* Radial glow top-left */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(6,182,212,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-20" style={{ zIndex: 1 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: text content ── */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeInUp}>
              <span
                className="inline-block text-sm font-medium px-4 py-1.5 rounded-full mb-6"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.25)',
                  color: '#67e8f9',
                }}
              >
                🟢 Más de 50 negocios chilenos ya usan Cliente Fiel
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold leading-tight mb-6"
              style={{ color: '#f1f5f9' }}
            >
              Reservas automáticas por WhatsApp.{' '}
              <span className="text-glow-cyan">Menos ausencias.</span>
              <br />
              Más clientes que vuelven.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg mb-10"
              style={{ color: '#94a3b8' }}
            >
              Conectas tu WhatsApp Business una vez. Tus clientes reservan con un mensaje,
              reciben recordatorios automáticos y vuelven solos — sin apps, sin formularios.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <Link href="/registro" className="btn-cyan px-8 py-4 rounded-xl text-lg">
                Prueba gratis 14 días →
              </Link>
              <Link href="/precios" className="btn-ghost-cyan px-8 py-4 rounded-xl text-lg font-semibold">
                Ver planes
              </Link>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-sm mt-4" style={{ color: '#475569' }}>
              Sin tarjeta hasta el día 14 · Cancela cuando quieras · Configura en 5 minutos
            </motion.p>

            {/* Stats */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mt-12 grid grid-cols-3 max-w-sm"
              style={{ borderTop: '1px solid rgba(6,182,212,0.1)', paddingTop: '1.5rem' }}
            >
              <motion.div variants={fadeInUp}>
                <StatItem end={60} prefix="-" suffix="%" label="Ausencias" />
              </motion.div>
              <motion.div
                variants={fadeInUp}
                style={{
                  borderLeft: '1px solid rgba(6,182,212,0.15)',
                  borderRight: '1px solid rgba(6,182,212,0.15)',
                }}
              >
                <StatItem end={3} suffix="x" label="ROI promedio" />
              </motion.div>
              <motion.div variants={fadeInUp}>
                <StatItem end={5} suffix=" min" label="Configuración" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ── Right: video in browser chrome ── */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="hidden lg:block"
          >
            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(6,182,212,0.25)',
                boxShadow:
                  '0 0 0 1px rgba(6,182,212,0.06), 0 0 60px rgba(6,182,212,0.15), 0 24px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* Browser chrome header */}
              <div
                style={{
                  background: '#1e2530',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                </div>
                {/* URL bar */}
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#94a3b8',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  app.clientefiel.cl/dashboard
                </div>
              </div>
              {/* Video */}
              <video
                ref={videoRef}
                src="/videocitas.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
