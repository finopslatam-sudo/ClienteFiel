// frontend/components/sections/Features.tsx
'use client'
import { motion } from 'framer-motion'

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
    <section className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900">¿Cómo funciona?</h2>
        <p className="text-slate-600 mt-3 text-lg">
          Conectas tu WhatsApp Business en 5 minutos. El resto funciona solo.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className="bg-slate-50 rounded-2xl p-6"
          >
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-slate-600">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
