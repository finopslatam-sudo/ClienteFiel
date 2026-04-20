// frontend/app/(marketing)/layout.tsx
import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: 'rgba(2, 11, 20, 0.85)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.08)',
        }}
      >
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_sinfondo.png?v=2" alt="Cliente Fiel" style={{ height: '52px', width: 'auto' }} />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/precios"
              className="text-sm transition-colors"
              style={{ color: '#94a3b8' }}
            >
              Precios
            </Link>
            <Link
              href="/login"
              className="text-sm transition-colors"
              style={{ color: '#94a3b8' }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="btn-ghost-cyan px-4 py-2 rounded-lg text-sm font-medium"
            >
              Prueba gratis
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer
        className="py-12 mt-20"
        style={{
          background: '#020b14',
          borderTop: '1px solid rgba(6, 182, 212, 0.08)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_sinfondo.png?v=2" alt="Cliente Fiel" style={{ height: '40px', width: 'auto' }} />
          </div>
          <p style={{ color: '#475569' }}>Automatiza tu WhatsApp Business. Sin apps, sin complicaciones.</p>
          <p className="mt-4" style={{ color: '#475569' }}>© 2026 Cliente Fiel. Chile.</p>
        </div>
      </footer>
    </>
  )
}
