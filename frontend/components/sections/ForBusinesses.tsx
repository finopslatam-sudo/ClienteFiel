// frontend/components/sections/ForBusinesses.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const businesses = [
  { icon: '💇', label: 'Peluquerías y barberías' },
  { icon: '💆', label: 'Spas y centros de estética' },
  { icon: '🦷', label: 'Consultorios y clínicas' },
  { icon: '🏋️', label: 'Gimnasios y entrenadores' },
  { icon: '🍽️', label: 'Restaurantes y cafeterías' },
  { icon: '🔧', label: 'Talleres y servicios técnicos' },
]

export function ForBusinesses() {
  return (
    <section className="w-full" style={{ background: '#020b14' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold mb-10"
            style={{ color: '#f1f5f9' }}
          >
            Para negocios que atienden con cita
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10"
          >
            {businesses.map((b) => (
              <motion.div
                key={b.label}
                variants={fadeInUp}
                className="glass-card p-4 flex items-center gap-3"
              >
                <span className="text-2xl flex-shrink-0">{b.icon}</span>
                <span className="text-sm font-medium text-left" style={{ color: '#94a3b8' }}>
                  {b.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            variants={fadeInUp}
            className="text-lg mb-8"
            style={{ color: '#94a3b8' }}
          >
            Si atiendes con hora, Cliente Fiel reduce tus ausencias y hace que tus clientes vuelvan solos.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Link href="/registro" className="btn-cyan px-8 py-3 rounded-xl font-semibold">
              Prueba 14 días gratis →
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
