// frontend/app/(marketing)/precios/page.tsx
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Precios — Cliente Fiel',
  description:
    'Planes simples sin sorpresas. Básico $1.000 CLP, Medio $40.000 CLP, Premium $60.000 CLP. 14 días gratis, sin tarjeta.',
}

export default function PreciosPage() {
  return (
    <>
      <div
        className="w-full pt-20 pb-4 text-center"
        style={{ background: '#030d1a' }}
      >
        <h1 className="text-4xl font-bold" style={{ color: '#f1f5f9' }}>
          Precios
        </h1>
        <p className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
          Suscripción mensual con tarjeta · Sin contratos · Cancela cuando quieras
        </p>
      </div>
      <Pricing />
      <FAQ />
    </>
  )
}
