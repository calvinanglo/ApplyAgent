'use client'

import { useEffect, useRef, useState } from 'react'

const stats = [
  { target: 109, suffix: '+', label: 'Company portals' },
  { target: 4, suffix: '', label: 'Job boards' },
  { target: 15, suffix: '', label: 'Industries' },
  { target: 5, suffix: '', label: 'ATS platforms' },
]

export function AnimatedStats() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [counts, setCounts] = useState(stats.map(() => 0))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const duration = 1200
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setCounts(stats.map(s => Math.round(s.target * ease)))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [visible])

  return (
    <div ref={ref} className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} className="text-center">
          <div className="text-3xl font-extrabold text-primary tabular-nums sm:text-4xl">
            {counts[i]}{s.suffix}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
