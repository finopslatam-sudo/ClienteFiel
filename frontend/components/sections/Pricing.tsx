// frontend/components/sections/Pricing.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const plans = [
  {
    name: 'Básico',
    price: '$29',
    subtitle: 'Agenda Automatizada',
    features: [
      'Reservas vía WhatsApp',
      'Configuración de horarios',
      'Confirmación automática inmediata',
      'Recordatorios: confirmación + 24h + 1h',
    ],
    cta: 'Empezar con Básico',
    href: '/registro?plan=basic',
    highlighted: false,
  },
  {
    name: 'Medio',
    price: '$59',
    subtitle: 'Recompra Inteligente',
    features: [
      'Todo el Plan Básico',
      'Recordatorios personalizados por servicio',
      'Configuración de recurrencia por cliente',
      'Mensaje automático de recompra post-visita',
    ],
    cta: 'Empezar con Medio',
    href: '/registro?plan=medium',
    highlighted: true,
  },
  {
    name: 'Premium',
    price: '$99',
    subtitle: 'Fidelización + Retención',
    features: [
      'Todo el Plan Medio',
      'Sistema de puntos y recompensas',
      'Segmentación de clientes y VIP',
      'Campañas automáticas ("Te extrañamos")',
      'Métricas: retorno, recurrencia, LTV',
    ],
    cta: 'Empezar con Premium',
    href: '/registro?plan=premium',
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="precios" className="w-full" style={{ background: '#030d1a' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
            Planes simples, sin sorpresas
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
            14 días gratis · Sin tarjeta · Cancela cuando quieras
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              className="glass-card glass-card-hover p-8 flex flex-col"
              style={
                plan.highlighted
                  ? {
                      border: '1px solid rgba(6,182,212,0.4)',
                      boxShadow: '0 0 30px rgba(6,182,212,0.08)',
                    }
                  : undefined
              }
            >
              {plan.highlighted && (
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start"
                  style={{ background: '#06b6d4', color: '#020b14' }}
                >
                  MÁS POPULAR
                </span>
              )}
              <div className="text-4xl font-bold" style={{ color: '#f1f5f9' }}>
                {plan.price}
                <span className="text-base font-normal" style={{ color: '#94a3b8' }}> USD/mes</span>
              </div>
              <div className="font-semibold mt-1" style={{ color: '#f1f5f9' }}>{plan.name}</div>
              <div className="text-sm mb-6" style={{ color: '#94a3b8' }}>{plan.subtitle}</div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#94a3b8' }}>
                    <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center py-3 rounded-xl font-semibold text-sm ${
                  plan.highlighted ? 'btn-cyan' : 'btn-ghost-cyan'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
