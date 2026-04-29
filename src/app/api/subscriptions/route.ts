import { getApiClient } from '@/lib/supabase/api'
import { getStripe } from '@/lib/stripe'

// GET — fetch current subscription
export async function GET(request: Request) {
  const supabase = await getApiClient(request)
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due', 'canceled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return Response.json({ subscription: sub || null })
}

// POST — manage subscription (cancel, resume, portal)
export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json()
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (action === 'portal') {
    // Open Stripe Customer Portal for self-service management
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found' }, { status: 400 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    })

    return Response.json({ url: portalSession.url })
  }

  if (action === 'cancel') {
    const { data: sub } = await db
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return Response.json({ error: 'No active subscription' }, { status: 400 })
    }

    // Cancel at period end (user keeps access until billing cycle ends)
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    await db.from('subscriptions').update({
      cancel_at_period_end: true,
    }).eq('stripe_subscription_id', sub.stripe_subscription_id)

    return Response.json({ success: true, message: 'Subscription will cancel at end of billing period' })
  }

  if (action === 'resume') {
    const { data: sub } = await db
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .single()

    if (!sub) {
      return Response.json({ error: 'No canceling subscription to resume' }, { status: 400 })
    }

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    await db.from('subscriptions').update({
      cancel_at_period_end: false,
    }).eq('stripe_subscription_id', sub.stripe_subscription_id)

    return Response.json({ success: true, message: 'Subscription resumed' })
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
