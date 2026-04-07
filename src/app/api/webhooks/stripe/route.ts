import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type Stripe from 'stripe'

// Use service role for webhook (no user session)
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function addCredits(db: any, userId: string, credits: number, description: string, stripeSessionId?: string) {
  const { data: balance } = await db
    .from('credit_balances')
    .select('balance')
    .eq('user_id', userId)
    .single()

  const currentBalance = balance?.balance || 0
  const newBalance = currentBalance + credits

  await db
    .from('credit_balances')
    .update({ balance: newBalance })
    .eq('user_id', userId)

  await db.from('credit_transactions').insert({
    user_id: userId,
    amount: credits,
    balance_after: newBalance,
    type: 'purchase',
    action: 'subscription',
    stripe_session_id: stripeSessionId || null,
    description,
  })
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  const stripe = getStripe()

  let event: Stripe.Event
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
    .single()

  if (existing) {
    return Response.json({ received: true, duplicate: true })
  }

  // Record event
  await db.from('stripe_events').insert({
    id: event.id,
    type: event.type,
  })

  switch (event.type) {
    // --- One-time payment completed ---
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'payment') {
        const userId = session.metadata?.user_id
        const credits = parseInt(session.metadata?.credits || '0', 10)
        if (userId && credits > 0) {
          await addCredits(db, userId, credits, `Purchased ${credits} credits`, session.id)
        }
      }
      // For subscription mode, the initial credit grant happens on invoice.payment_succeeded
      if (session.mode === 'subscription') {
        const userId = session.metadata?.user_id
        const planId = session.metadata?.plan_id
        const billingPeriod = session.metadata?.billing_period as 'monthly' | 'annually'
        const creditsPerMonth = parseInt(session.metadata?.credits_per_month || '0', 10)
        const subscriptionId = session.subscription as string

        if (userId && subscriptionId && planId) {
          // Fetch subscription details from Stripe
          const subResponse = await stripe.subscriptions.retrieve(subscriptionId)
          const sub = subResponse as any

          // Save subscription record
          await db.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            plan_id: planId,
            billing_period: billingPeriod || 'monthly',
            status: 'active',
            credits_per_month: creditsPerMonth,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          }, { onConflict: 'stripe_subscription_id' })
        }
      }
      break
    }

    // --- Subscription invoice paid (initial + recurring) ---
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any
      if (!invoice.subscription) break

      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id

      // Look up our subscription record
      const { data: sub } = await db
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (sub) {
        // Skip proration invoices (plan switches) — only credit on create/renew
        const reason = invoice.billing_reason
        if (reason === 'subscription_update') break

        const isFirst = reason === 'subscription_create'
        const description = isFirst
          ? `${sub.plan_id} subscription started — ${sub.credits_per_month} credits`
          : `${sub.plan_id} subscription renewed — ${sub.credits_per_month} credits`

        await addCredits(db, sub.user_id, sub.credits_per_month, description)

        // Update period dates
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as any
        await db.from('subscriptions').update({
          status: 'active',
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end,
        }).eq('stripe_subscription_id', subscriptionId)
      }
      break
    }

    // --- Subscription updated (plan change, cancellation scheduled) ---
    case 'customer.subscription.updated': {
      const subObj = event.data.object as any
      const subscriptionId = subObj.id

      const { data: sub } = await db
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (sub) {
        const status = subObj.status === 'active' ? 'active'
          : subObj.status === 'past_due' ? 'past_due'
          : subObj.status === 'canceled' ? 'canceled'
          : 'incomplete'

        // Detect plan change via price ID and update credits_per_month
        const update: Record<string, unknown> = {
          status,
          cancel_at_period_end: subObj.cancel_at_period_end,
          current_period_start: new Date(subObj.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subObj.current_period_end * 1000).toISOString(),
        }

        // If plan metadata changed (e.g. customer switched plans via portal)
        const newPlanId = subObj.metadata?.plan_id
        const newCredits = parseInt(subObj.metadata?.credits_per_month || '0', 10)
        const newBilling = subObj.metadata?.billing_period
        if (newPlanId && newPlanId !== sub.plan_id) {
          update.plan_id = newPlanId
          if (newCredits > 0) update.credits_per_month = newCredits
          if (newBilling) update.billing_period = newBilling
        }

        await db.from('subscriptions').update(update).eq('stripe_subscription_id', subscriptionId)
      }
      break
    }

    // --- Subscription deleted (fully canceled) ---
    case 'customer.subscription.deleted': {
      const deletedSub = event.data.object as any
      await db.from('subscriptions').update({
        status: 'canceled',
        cancel_at_period_end: false,
      }).eq('stripe_subscription_id', deletedSub.id)
      break
    }

    // --- Payment failed on subscription ---
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      if (!invoice.subscription) break

      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id

      await db.from('subscriptions').update({
        status: 'past_due',
      }).eq('stripe_subscription_id', subscriptionId)
      break
    }
  }

  return Response.json({ received: true })
}
