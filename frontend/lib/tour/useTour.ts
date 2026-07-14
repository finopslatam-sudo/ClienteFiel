// frontend/lib/tour/useTour.ts
'use client'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { routeTours, driverConfig } from './steps'

function hasSeenTour(storageKey: string): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(storageKey) === '1'
}

function markTourSeen(storageKey: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey, '1')
}

export function useTour(pathname: string) {
  function startTourForRoute(force = false): boolean {
    const tour = routeTours.find((t) => pathname.startsWith(t.route))
    if (!tour) return false
    if (!force && hasSeenTour(tour.storageKey)) return false

    const target = document.querySelector(tour.steps[0].element as string)
    if (!target) return false

    const instance = driver({ ...driverConfig, steps: tour.steps })
    instance.drive()
    markTourSeen(tour.storageKey)
    return true
  }

  return { startTourForRoute }
}
