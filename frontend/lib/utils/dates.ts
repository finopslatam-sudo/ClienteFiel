// frontend/lib/utils/dates.ts
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return `${format(start, 'd MMM', { locale: es })} — ${format(end, 'd MMM yyyy', { locale: es })}`
}

export function nextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function prevWeek(date: Date): Date {
  return subWeeks(date, 1)
}
