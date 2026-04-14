// frontend/lib/hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Booking {
  id: string
  customer_id: string
  service_id: string
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'no_show'
  created_by: 'whatsapp' | 'admin'
  created_at: string
  customer_name: string | null
  customer_phone: string | null
  service_name: string | null
}

export function useBookings(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['bookings', dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const { data } = await api.get<{ bookings: Booking[]; total: number }>('/api/v1/bookings', { params })
      return data
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/v1/bookings/${bookingId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useCompleteBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/v1/bookings/${bookingId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      customer_phone: string
      customer_name?: string
      service_id: string
      scheduled_at: string
    }) => api.post('/api/v1/bookings', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}
