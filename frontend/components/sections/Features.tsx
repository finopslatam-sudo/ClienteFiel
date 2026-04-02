// frontend/components/sections/Features.tsx
'use client'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const features = [
  {
    icon: '📅',
    title: 'Reservas por WhatsApp',
    description:
      'Tus clientes reservan enviando un mensaje. El sistema guía la conversación con botones — sin que el cliente instale nada.',
  },
  {
    icon: '⏰',
    title: 'Recordatorios automáticos',
    description:
      'Confirmación inmediata, recordatorio 24h antes y 1h antes. Reduce ausencias hasta un 60% sin trabajo manual.',
  },
  {
    icon: '🔄',
    title: 'Clientes que vuelven solos',
    description:
      'Mensaje de recompra post-visita y campañas automáticas de "te extrañamos". Tus clientes regresan 2x más.',
  },
  {
    icon: '📊',
    title: 'Panel de control',
    description:
      'Agenda semanal, historial de clientes, métricas de retorno. Todo desde un dashboard limpio y fácil de usar.',
  },
]

export function Features() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
            ¿Cómo funciona?
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
            Conectas tu WhatsApp Business en 5 minutos. El resto funciona solo.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              className="glass-card glass-card-hover p-6"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#f1f5f9' }}>{f.title}</h3>
              <p style={{ color: '#94a3b8' }}>{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
