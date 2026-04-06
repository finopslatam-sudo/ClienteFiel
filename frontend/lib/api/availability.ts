// frontend/lib/api/availability.ts
import api from '@/lib/api'

export interface AvailabilityRule {
  id: string
  day_of_week: number  // 0=Mon, 6=Sun
  start_time: string   // "HH:MM:SS"
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  max_bookings_per_day: number | null
  is_active: boolean
  timezone: string
}

export interface AvailabilityRuleInput {
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  max_bookings_per_day?: number | null
  is_active: boolean
  timezone: string
}

export interface AvailabilityOverride {
  id: string
  override_date: string
  is_closed: boolean
  custom_start_time: string | null
  custom_end_time: string | null
  reason: string | null
}

export interface AvailabilityOverrideInput {
  override_date: string
  is_closed: boolean
  custom_start_time?: string | null
  custom_end_time?: string | null
  reason?: string | null
}

export interface Slot {
  start: string
  end: string
  available: boolean
}

export interface SlotListResponse {
  date: string
  slots: Slot[]
}

export const availabilityApi = {
  getRules: async (): Promise<{ rules: AvailabilityRule[] }> => {
    const { data } = await api.get('/api/v1/availability/rules')
    return data
  },

  upsertRules: async (rules: AvailabilityRuleInput[]): Promise<{ rules: AvailabilityRule[] }> => {
    const { data } = await api.put('/api/v1/availability/rules', { rules })
    return data
  },

  getSlots: async (date: string, serviceId: string): Promise<SlotListResponse> => {
    const { data } = await api.get('/api/v1/availability/slots', {
      params: { date, service_id: serviceId },
    })
    return data
  },

  getOverrides: async (fromDate: string, toDate: string): Promise<AvailabilityOverride[]> => {
    const { data } = await api.get('/api/v1/availability/overrides', {
      params: { from_date: fromDate, to_date: toDate },
    })
    return data
  },

  createOverride: async (input: AvailabilityOverrideInput): Promise<AvailabilityOverride> => {
    const { data } = await api.post('/api/v1/availability/overrides', input)
    return data
  },

  deleteOverride: async (overrideId: string): Promise<void> => {
    await api.delete(`/api/v1/availability/overrides/${overrideId}`)
  },
}
