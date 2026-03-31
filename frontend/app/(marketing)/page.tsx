// frontend/app/(marketing)/page.tsx
import { Hero } from '@/components/sections/Hero'
import { Features } from '@/components/sections/Features'
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cliente Fiel — Reservas y Fidelización por WhatsApp para tu Negocio',
  description:
    'Automatiza reservas, recordatorios y fidelización de clientes vía WhatsApp Business. Sin apps que instalar. Prueba 14 días gratis sin tarjeta.',
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
    </>
  )
}
