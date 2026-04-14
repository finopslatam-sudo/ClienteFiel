// frontend/components/sections/FinalCTA.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

export function FinalCTA() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      {/* Radial glow bottom-center — bookend with Hero's top glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 110%, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}
      />
      <div className="relative max-w-3xl mx-auto px-4 py-24 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: '#f1f5f9' }}
          >
            ¿Listo para dejar de perder horas en WhatsApp?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg mb-8"
            style={{ color: '#94a3b8' }}
          >
            Configura en 5 minutos. Los primeros 14 días son gratis, sin tarjeta.
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/registro" className="btn-cyan px-8 py-4 rounded-xl text-lg font-semibold">
              Crear mi cuenta gratis →
            </Link>
            <Link
              href="/#precios"
              className="btn-ghost-cyan px-8 py-4 rounded-xl text-lg font-semibold"
            >
              Ver planes
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
