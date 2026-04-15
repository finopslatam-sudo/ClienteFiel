// frontend/app/(marketing)/page.tsx
import Script from 'next/script'
import { Hero } from '@/components/sections/Hero'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { VideoDemo } from '@/components/sections/VideoDemo'
import { Features } from '@/components/sections/Features'
import { ForBusinesses } from '@/components/sections/ForBusinesses'
import { SocialProof } from '@/components/sections/SocialProof'
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import { FinalCTA } from '@/components/sections/FinalCTA'
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
    { '@type': 'Offer', name: 'Plan Básico', price: '3000', priceCurrency: 'CLP' },
    { '@type': 'Offer', name: 'Plan Medio', price: '40000', priceCurrency: 'CLP' },
    { '@type': 'Offer', name: 'Plan Premium', price: '60000', priceCurrency: 'CLP' },
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
      <HowItWorks />
      <VideoDemo />
      <Features />
      <ForBusinesses />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  )
}
