// frontend/app/(admin)/layout.tsx
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: '#030d1a', minHeight: '100vh' }}>
      {children}
    </div>
  )
}
