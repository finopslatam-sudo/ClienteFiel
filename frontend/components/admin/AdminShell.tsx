// frontend/components/admin/AdminShell.tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/tenants', label: 'Clientes', icon: '🏢' },
  { href: '/admin/credentials', label: 'Credenciales', icon: '🔑' },
  { href: '/admin/settings', label: 'Ajustes', icon: '⚙️' },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_access_token')) {
      router.replace('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token')
    router.push('/admin/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#030d1a' }}>
      <aside
        className="w-52 flex flex-col h-screen sticky top-0"
        style={{ background: 'rgba(2,11,20,0.98)', borderRight: '1px solid rgba(239,68,68,0.12)' }}
      >
        <div className="p-5" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
          <div className="text-xs font-bold tracking-widest" style={{ color: '#ef4444' }}>ADMIN</div>
          <div className="text-sm font-semibold mt-0.5" style={{ color: '#f1f5f9' }}>Cliente Fiel</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={
                  isActive
                    ? { background: 'rgba(239,68,68,0.1)', borderLeft: '2px solid #ef4444', color: '#ef4444', paddingLeft: '10px' }
                    : { color: '#94a3b8' }
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(239,68,68,0.1)' }}>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm px-3 py-2 rounded-lg transition-colors"
            style={{ color: '#475569' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
