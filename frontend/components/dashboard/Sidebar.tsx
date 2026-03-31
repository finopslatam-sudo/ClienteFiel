// frontend/components/dashboard/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/logs', label: 'Logs', icon: '📋' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-200">
        <span className="font-bold text-lg text-indigo-600">Cliente Fiel</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={() => logout()}
          className="w-full text-left text-sm text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
