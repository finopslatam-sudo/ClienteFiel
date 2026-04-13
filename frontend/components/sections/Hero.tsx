// frontend/components/sections/Hero.tsx
'use client'
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
  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      {/* Cyber Grid */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      {/* Radial glow top-center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
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
            className="text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ color: '#f1f5f9' }}
          >
            Reservas automáticas por WhatsApp.{' '}
            <span className="text-glow-cyan">Menos ausencias.</span>
            <br />
            Más clientes que vuelven.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl max-w-2xl mx-auto mb-10"
            style={{ color: '#94a3b8' }}
          >
            Conectas tu WhatsApp Business una vez. Tus clientes reservan con un mensaje,
            reciben recordatorios automáticos y vuelven solos — sin apps, sin formularios.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
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
        </motion.div>

        {/* Stats with CountUp */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-16 grid grid-cols-3 max-w-lg mx-auto"
          style={{ borderTop: '1px solid rgba(6,182,212,0.1)', paddingTop: '2rem' }}
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
      </div>
    </section>
  )
}
