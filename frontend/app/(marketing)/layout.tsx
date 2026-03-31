// frontend/app/(marketing)/layout.tsx
import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-indigo-600">
            Cliente Fiel
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/precios" className="text-slate-600 hover:text-slate-900 text-sm">
              Precios
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Prueba gratis
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="font-semibold text-white mb-2">Cliente Fiel</p>
          <p>Automatiza tu WhatsApp Business. Sin apps, sin complicaciones.</p>
          <p className="mt-4">© 2026 Cliente Fiel. Chile.</p>
        </div>
      </footer>
    </>
  )
}
