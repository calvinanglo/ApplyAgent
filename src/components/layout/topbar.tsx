import { createClient } from '@/lib/supabase/server'
import { CreditBadge } from '@/components/layout/credit-badge'

export async function Topbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let credits = 0
  let freeRemaining = 3
  if (user) {
    const { data: balance } = await supabase
      .from('credit_balances')
      .select('balance, free_evaluations_used')
      .eq('user_id', user.id)
      .single() as any

    if (balance) {
      credits = balance.balance
      freeRemaining = Math.max(0, 3 - (balance.free_evaluations_used || 0))
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        <CreditBadge credits={credits} freeRemaining={freeRemaining} />
        <span className="text-sm text-muted-foreground">{user?.email}</span>
      </div>
    </header>
  )
}
