import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Use service role for webhook (no user session)
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  const stripe = getStripe()

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return Response.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()
  const db = supabase as any

  // Idempotency check
  const { data: existing } = await db
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single() as any

  if (existing) {
    return Response.json({ received: true, duplicate: true })
  }

  // Record event
  await (db.from('stripe_events').insert({
    id: event.id,
    type: event.type,
  }) as any)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const credits = parseInt(session.metadata?.credits || '0', 10)

    if (userId && credits > 0) {
      // Add credits
      const { data: balance } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single() as any

      const currentBalance = balance?.balance || 0
      const newBalance = currentBalance + credits

      await db
        .from('credit_balances')
        .update({ balance: newBalance })
        .eq('user_id', userId)

      // Log transaction
      await db.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        balance_after: newBalance,
        type: 'purchase',
        stripe_session_id: session.id,
        description: `Purchased ${credits} credits`,
      })
    }
  }

  return Response.json({ received: true })
}
