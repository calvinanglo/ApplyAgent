'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { SunMedium, MoonStar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="size-9" />

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
    </Button>
  )
}
