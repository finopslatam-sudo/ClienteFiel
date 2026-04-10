// frontend/lib/adminApi.ts
import axios, { InternalAxiosRequestConfig } from 'axios'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as RetryableRequestConfig
    if (error.response?.status === 401 && !original._retry) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_access_token')
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

export default adminApi
