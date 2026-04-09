// frontend/lib/auth.ts
import api from '@/lib/api'
import { useAuthStore, type AuthUser } from '@/store/auth'

interface RegisterPayload {
  first_name: string
  last_name: string
  business_name: string
  email: string
  password: string
}

interface LoginPayload {
  email: string
  password: string
}

export async function register(payload: RegisterPayload): Promise<void> {
  const { data } = await api.post<{ access_token: string; user: AuthUser }>('/api/v1/auth/register', payload)
  localStorage.setItem('access_token', data.access_token)
  useAuthStore.getState().setUser(data.user)
}

export async function login(payload: LoginPayload): Promise<void> {
  const { data } = await api.post<{ access_token: string }>('/api/v1/auth/login', payload)
  localStorage.setItem('access_token', data.access_token)
  const me = await api.get<AuthUser>('/api/v1/auth/me')
  useAuthStore.getState().setUser(me.data)
}

export async function logout(): Promise<void> {
  await api.post('/api/v1/auth/logout').catch(() => {})
  useAuthStore.getState().clearUser()
  window.location.href = '/login'
}

export async function fetchCurrentUser(): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) return
  try {
    const { data } = await api.get<AuthUser>('/api/v1/auth/me')
    useAuthStore.getState().setUser(data)
  } catch {
    useAuthStore.getState().clearUser()
  }
}
