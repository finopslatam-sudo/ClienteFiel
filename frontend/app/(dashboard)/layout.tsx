// frontend/app/(dashboard)/layout.tsx
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { PlanStatusBadge } from '@/components/dashboard/PlanStatusBadge'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#030d1a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end px-8 pt-5 pb-0">
          <PlanStatusBadge />
        </div>
        <main className="flex-1 p-8 pt-4">
          {children}
        </main>
      </div>
    </div>
  )
}
