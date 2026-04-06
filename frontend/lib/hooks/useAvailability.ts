// frontend/lib/hooks/useAvailability.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { availabilityApi, AvailabilityRuleInput, AvailabilityOverrideInput } from '@/lib/api/availability'

export function useAvailabilityRules() {
  return useQuery({
    queryKey: ['availability', 'rules'],
    queryFn: availabilityApi.getRules,
  })
}

export function useUpsertRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rules: AvailabilityRuleInput[]) => availabilityApi.upsertRules(rules),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', 'rules'] }),
  })
}

export function useSlots(date: string | null, serviceId: string | null) {
  return useQuery({
    queryKey: ['availability', 'slots', date, serviceId],
    queryFn: () => availabilityApi.getSlots(date!, serviceId!),
    enabled: Boolean(date && serviceId),
  })
}

export function useCreateOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AvailabilityOverrideInput) => availabilityApi.createOverride(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  })
}

export function useDeleteOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (overrideId: string) => availabilityApi.deleteOverride(overrideId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  })
}
