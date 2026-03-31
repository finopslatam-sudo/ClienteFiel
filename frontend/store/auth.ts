// frontend/store/auth.ts
import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'staff'
  tenant_id: string
}

interface AuthStore {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
    }
    set({ user: null })
  },
}))
