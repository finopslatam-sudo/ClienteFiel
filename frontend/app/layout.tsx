import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cliente Fiel — Reservas y Fidelización por WhatsApp',
  description:
    'Automatiza tus reservas, recordatorios y fidelización de clientes por WhatsApp. Sin apps, sin complicaciones. Prueba gratis 14 días.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://clientefiel.cl'),
  openGraph: {
    type: 'website',
    title: 'Cliente Fiel — Reservas y Fidelización por WhatsApp',
    description: 'Automatiza tu WhatsApp Business. Reservas, recordatorios y fidelización para tu negocio.',
    siteName: 'Cliente Fiel',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
