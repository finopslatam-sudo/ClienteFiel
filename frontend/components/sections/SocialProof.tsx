// frontend/components/sections/SocialProof.tsx
'use client'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

// TODO: Replace with real customer testimonials before marketing launch
const testimonials = [
  {
    quote:
      'Antes me olvidaba de recordar a los clientes y tenía 3-4 ausencias a la semana. Ahora casi cero.',
    name: 'María',
    business: 'Peluquería',
    city: 'Santiago',
  },
  {
    quote:
      'Mis clientes reservan a las 11pm cuando yo ya dormí. Al otro día llegan con su confirmación en WhatsApp.',
    name: 'Roberto',
    business: 'Barbería',
    city: 'Valparaíso',
  },
  {
    quote:
      'Lo configuré en una tarde. La semana siguiente ya estaba mandando recordatorios solo.',
    name: 'Daniela',
    business: 'Spa',
    city: 'Concepción',
  },
]

export function SocialProof() {
  return (
    <section className="w-full" style={{ background: '#030d1a' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold"
            style={{ color: '#f1f5f9' }}
          >
            Lo que dicen nuestros clientes
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeInUp}
              className="glass-card p-6 flex flex-col"
            >
              <span
                className="text-4xl font-serif leading-none mb-4"
                style={{ color: '#06b6d4' }}
              >
                &ldquo;
              </span>
              <p
                className="text-sm leading-relaxed flex-1 mb-4"
                style={{ color: '#94a3b8' }}
              >
                {t.quote}
              </p>
              <div>
                <div className="font-medium text-sm" style={{ color: '#f1f5f9' }}>
                  {t.name}
                </div>
                <div className="text-xs" style={{ color: '#475569' }}>
                  {t.business} · {t.city}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
