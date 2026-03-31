// frontend/components/sections/Hero.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          ✅ Tus clientes ya tienen WhatsApp — úsalo
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
          Reservas y recordatorios{' '}
          <span className="text-indigo-600">automáticos</span>
          <br />
          por WhatsApp
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          Cliente Fiel automatiza tu WhatsApp Business. Tus clientes reservan, reciben
          recordatorios y vuelven solos — sin apps que instalar, sin formularios complicados.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/registro"
            className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Prueba gratis 14 días →
          </Link>
          <Link
            href="/precios"
            className="border border-slate-300 text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Ver planes
          </Link>
        </div>
        <p className="text-slate-500 text-sm mt-4">
          Sin tarjeta hasta el día 14 · Cancela cuando quieras · Configura en 5 minutos
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
      >
        {[
          { value: '-60%', label: 'Menos ausencias' },
          { value: '2x', label: 'Más retorno' },
          { value: '5 min', label: 'Para configurar' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-bold text-indigo-600">{stat.value}</div>
            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
