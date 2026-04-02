// frontend/components/sections/FAQ.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const faqs = [
  {
    q: '¿Necesito tener WhatsApp Business?',
    a: 'Sí, necesitas un número de WhatsApp Business activo. Es gratuito y lo configuras directamente con Meta. Cliente Fiel te orienta en el proceso.',
  },
  {
    q: '¿Mis clientes necesitan instalar algo?',
    a: 'No. Tus clientes usan el WhatsApp que ya tienen instalado en su teléfono. No hay apps adicionales.',
  },
  {
    q: '¿Cómo se conecta mi WhatsApp Business?',
    a: 'En tu dashboard hay un botón "Conectar con Meta". Haces clic, autorizas con tu cuenta Meta y listo — menos de 2 minutos.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí, sin penalizaciones. Cancelas desde tu panel de facturación y no se te cobra el siguiente período.',
  },
  {
    q: '¿Para qué tipos de negocio sirve?',
    a: 'Peluquerías, spas, consultorios, restaurantes, talleres — cualquier negocio que atienda clientes con citas o reservas.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="w-full" style={{ background: '#020b14' }}>
      <div className="max-w-3xl mx-auto px-4 py-20">
        <motion.h2
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-10"
          style={{ color: '#f1f5f9' }}
        >
          Preguntas frecuentes
        </motion.h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-2 py-4 font-medium flex justify-between items-center transition-colors"
                style={{ color: '#f1f5f9' }}
              >
                {faq.q}
                <span className="text-glow-cyan ml-4 text-lg font-light flex-shrink-0">
                  {open === i ? '−' : '+'}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="px-2 pb-4 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
