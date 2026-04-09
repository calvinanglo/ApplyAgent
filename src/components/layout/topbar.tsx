'use client'

import { useEffect, useState } from 'react'
import { CreditBadge } from '@/components/layout/credit-badge'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { createClient } from '@/lib/supabase/client'

export function Topbar() {
  const [credits, setCredits] = useState<number | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      const { data: balance } = await (supabase as any)
        .from('credit_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      setCredits(balance?.balance ?? 0)
    }
    load()
    // Refresh credits every 30s
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <MobileMenuButton />
      <div className="flex items-center gap-2 md:gap-4">
        <CreditBadge credits={credits ?? 0} freeRemaining={0} />
        <ThemeToggle />
        <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
      </div>
    </header>
  )
}
