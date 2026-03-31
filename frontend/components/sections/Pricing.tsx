// frontend/components/sections/Pricing.tsx
'use client'
import Link from 'next/link'

const plans = [
  {
    name: 'Básico',
    price: '$29',
    subtitle: 'Agenda Automatizada',
    color: 'border-slate-200',
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
    color: 'border-indigo-500',
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
    color: 'border-amber-400',
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
    <section id="precios" className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900">Planes simples, sin sorpresas</h2>
        <p className="text-slate-600 mt-3 text-lg">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`border-2 ${plan.color} rounded-2xl p-8 ${plan.highlighted ? 'shadow-lg scale-105' : ''}`}
          >
            {plan.highlighted && (
              <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                MÁS POPULAR
              </span>
            )}
            <div className="text-4xl font-bold text-slate-900">
              {plan.price}
              <span className="text-base font-normal text-slate-500"> USD/mes</span>
            </div>
            <div className="font-semibold text-slate-800 mt-1">{plan.name}</div>
            <div className="text-sm text-slate-500 mb-6">{plan.subtitle}</div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                plan.highlighted
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
