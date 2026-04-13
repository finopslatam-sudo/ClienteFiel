// frontend/components/sections/HowItWorks.tsx
'use client'
import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const steps = [
  {
    number: '1',
    icon: '📱',
    title: 'Conectas tu WhatsApp Business',
    description:
      'Autoriza con tu cuenta Meta en menos de 2 minutos. Sin código, sin técnico.',
  },
  {
    number: '2',
    icon: '💬',
    title: 'Tus clientes reservan con un mensaje',
    description:
      'Envían un mensaje a tu número. El bot guía la conversación con botones — ellos ya saben usar WhatsApp.',
  },
  {
    number: '3',
    icon: '⚡',
    title: 'El sistema trabaja por ti',
    description:
      'Confirmación inmediata, recordatorio 24h antes y 1h antes. Después de la visita, mensaje de recompra automático.',
  },
]

export function HowItWorks() {
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
            Funciona en 3 pasos simples
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-stretch gap-4"
        >
          {steps.map((step, i) => (
            <Fragment key={step.number}>
              <motion.div
                variants={fadeInUp}
                className="glass-card p-6 flex-1 flex flex-col items-center text-center"
              >
                <div
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mb-4 flex-shrink-0"
                  style={{
                    background: 'rgba(6,182,212,0.15)',
                    border: '1px solid rgba(6,182,212,0.3)',
                    color: '#06b6d4',
                  }}
                >
                  {step.number}
                </div>
                <div className="text-3xl mb-3">{step.icon}</div>
                <h3 className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>
                  {step.title}
                </h3>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  {step.description}
                </p>
              </motion.div>

              {i < steps.length - 1 && (
                <div
                  className="hidden md:flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ color: 'rgba(6,182,212,0.4)' }}
                >
                  →
                </div>
              )}
            </Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
