'use client'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/motion'

export function VideoDemo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(!muted)
  }

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: '#030d1a' }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* Ambient glow behind video frame */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(6,182,212,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 py-20">

        {/* — Section header — */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block text-sm font-medium px-4 py-1.5 rounded-full mb-5"
            style={{
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.25)',
              color: '#67e8f9',
            }}
          >
            Demo en vivo
          </motion.span>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: '#f1f5f9' }}
          >
            Ve cómo funciona en{' '}
            <span className="text-glow-cyan">60 segundos</span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg max-w-2xl mx-auto"
            style={{ color: '#94a3b8' }}
          >
            Desde que tu cliente escribe hasta que tiene su cita confirmada —
            todo automático, en el WhatsApp que ya usa todos los días.
          </motion.p>
        </motion.div>

        {/* — Video card — */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid rgba(6,182,212,0.22)',
            boxShadow:
              '0 0 0 1px rgba(6,182,212,0.05), 0 0 60px rgba(6,182,212,0.12), 0 32px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              background: '#0d1f2d',
              borderBottom: '1px solid rgba(6,182,212,0.12)',
              padding: '11px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Traffic-light dots */}
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e', display: 'block' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840', display: 'block' }} />
            </div>

            {/* Fake URL bar */}
            <div
              style={{
                flex: 1,
                background: 'rgba(2,11,20,0.6)',
                border: '1px solid rgba(6,182,212,0.1)',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                color: '#475569',
                textAlign: 'center',
                letterSpacing: '0.01em',
              }}
            >
              🔒&nbsp; app.clientefiel.riava.cl — Panel de reservas
            </div>

            {/* Sound toggle — top-right of chrome */}
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              style={{
                flexShrink: 0,
                background: 'rgba(6,182,212,0.08)',
                border: '1px solid rgba(6,182,212,0.2)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#67e8f9',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'background 0.2s',
              }}
            >
              {muted ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                  Activar sonido
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                  Silenciar
                </>
              )}
            </button>
          </div>

          {/* Video */}
          <div style={{ background: '#020b14', lineHeight: 0 }}>
            <video
              ref={videoRef}
              src="/videocitas.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        </motion.div>

        {/* Caption */}
        <motion.p
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center text-sm mt-5"
          style={{ color: '#3d5166' }}
        >
          Flujo real — sin edición · Configuración completa en menos de 5 minutos
        </motion.p>
      </div>
    </section>
  )
}
