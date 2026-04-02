'use client'
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export function useCountUp(end: number, duration = 2) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let cancelled = false
    let startTime: number | null = null
    const animate = (timestamp: number) => {
      if (cancelled) return
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      setValue(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
    return () => { cancelled = true }
  }, [isInView, end, duration])

  return { ref, value }
}
