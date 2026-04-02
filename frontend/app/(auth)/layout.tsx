// frontend/app/(auth)/layout.tsx
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const brandFeatures = [
    { icon: '📅', text: 'Reservas automáticas por WhatsApp' },
    { icon: '⏰', text: 'Recordatorios 24h y 1h antes' },
    { icon: '🔄', text: 'Clientes que vuelven solos' },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#020b14' }}>
      {/* Cyber Grid */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative min-h-screen grid md:grid-cols-2">
        {/* Left panel — brand, hidden on mobile */}
        <div className="hidden md:flex flex-col items-center justify-center px-12 py-20">
          <div className="max-w-sm text-center">
            <div className="text-3xl font-bold mb-3" style={{ color: '#f1f5f9' }}>
              Cliente Fiel
            </div>
            <p className="mb-10" style={{ color: '#94a3b8' }}>
              Automatiza tu WhatsApp Business. Tus clientes reservan solos.
            </p>
            <div className="space-y-3">
              {brandFeatures.map((item) => (
                <div
                  key={item.text}
                  className="glass-card flex items-center gap-3 px-4 py-3 text-sm text-left"
                  style={{ color: '#94a3b8' }}
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex items-center justify-center px-4 py-12 md:px-12">
          <div className="w-full max-w-md">
            {/* Mobile logo — only shown when left panel is hidden */}
            <div className="md:hidden text-center mb-8">
              <span className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Cliente Fiel</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
