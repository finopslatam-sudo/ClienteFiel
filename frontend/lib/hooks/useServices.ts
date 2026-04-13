// frontend/lib/hooks/useServices.ts
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: string
  is_active: boolean
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get<Service[]>('/api/v1/services')
      return data
    },
  })
}
