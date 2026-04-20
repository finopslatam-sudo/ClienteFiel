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
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" style={{ height: '38px', width: 'auto' }} />
            <span style={{ fontSize: '19px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Cliente<span style={{ color: '#06b6d4' }}>Fiel</span>
            </span>
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
          <div className="flex justify-center items-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" style={{ height: '32px', width: 'auto' }} />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Cliente<span style={{ color: '#06b6d4' }}>Fiel</span>
            </span>
          </div>
          <p style={{ color: '#475569' }}>Automatiza tu WhatsApp Business. Sin apps, sin complicaciones.</p>
          <p className="mt-4" style={{ color: '#475569' }}>© 2026 Cliente Fiel. Chile.</p>
        </div>
      </footer>
    </>
  )
}
