// frontend/components/dashboard/Sidebar.tsx
'use client'
import Link from 'next/link'

import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/cuenta', label: 'Cuenta', icon: '👤' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/logs', label: 'Logs', icon: '📋' },
  { href: '/suscripcion', label: 'Suscripción', icon: '💳' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex flex-col h-screen sticky top-0"
      style={{
        background: 'rgba(2, 11, 20, 0.98)',
        borderRight: '1px solid rgba(6, 182, 212, 0.08)',
      }}
    >
      <div
        className="p-6"
        style={{ borderBottom: '1px solid rgba(6, 182, 212, 0.08)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Cliente Fiel" style={{ height: '40px', width: 'auto' }} />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: 'rgba(6, 182, 212, 0.1)',
                      borderLeft: '2px solid #06b6d4',
                      color: '#06b6d4',
                      paddingLeft: '10px',
                    }
                  : { color: '#94a3b8' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'
                  e.currentTarget.style.color = '#f1f5f9'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(6, 182, 212, 0.08)' }}>
        <button
          onClick={() => logout()}
          className="w-full text-left text-sm px-3 py-2 rounded-lg transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#94a3b8'
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
