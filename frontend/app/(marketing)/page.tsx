// frontend/app/(marketing)/page.tsx
import Script from 'next/script'
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cliente Fiel',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Sistema de reservas y fidelización vía WhatsApp para pequeños negocios. Sin apps, sin complicaciones.',
  offers: [
    { '@type': 'Offer', name: 'Plan Básico', price: '29', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Plan Medio', price: '59', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Plan Premium', price: '99', priceCurrency: 'USD' },
  ],
}

export default function HomePage() {
  return (
    <>
      <Script
        id="schema-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
    </>
  )
}
