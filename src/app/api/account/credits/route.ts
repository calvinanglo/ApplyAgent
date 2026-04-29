/**
 * GET /api/account/credits
 *
 * Mobile-friendly summary of the user's credit + subscription state.
 * Single round-trip for the dashboard widget instead of 3 separate queries.
 *
 * Response: {
 *   balance: number,
 *   plan: { id, name, credits_per_month, status, provider, cancel_at_period_end } | null,
 *   recent_transactions: Array<{ amount, action, created_at }>
 * }
 */

import { getApiClient } from '@/lib/supabase/api'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = await getApiClient(request)
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Three queries in parallel — RLS-scoped so we don't need admin client.
  const [balanceRes, subRes, txRes] = await Promise.all([
    db.from('credit_balances').select('balance').eq('user_id', user.id).single(),
    db
      .from('subscriptions')
      .select('id, plan_id, status, current_period_end, cancel_at_period_end, provider, external_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'past_due', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('credit_transactions')
      .select('amount, action, balance_after, created_at, description')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return Response.json({
    balance: balanceRes.data?.balance ?? 0,
    subscription: subRes.data || null,
    recent_transactions: txRes.data || [],
  })
}
