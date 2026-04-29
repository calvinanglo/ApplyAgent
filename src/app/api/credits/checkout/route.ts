import { getApiClient } from '@/lib/supabase/api'
import { getStripe, getOrCreateCustomer, STRIPE_SUBSCRIPTION_PRICES } from '@/lib/stripe'
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success: withinLimit } = await rateLimit(`checkout:${user.id}`, 5, 60_000)
  if (!withinLimit) {
    return Response.json({ error: 'Too many checkout attempts. Please wait.' }, { status: 429 })
  }

  let pack_id: string | undefined, plan_id: string | undefined, billing_period: string | undefined
  try {
    const body = await request.json()
    pack_id = body.pack_id
    plan_id = body.plan_id
    billing_period = body.billing_period
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // --- Subscription checkout ---
  if (plan_id && billing_period) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === plan_id)
    if (!plan) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const period = billing_period as 'monthly' | 'annually'
    const priceConfig = STRIPE_SUBSCRIPTION_PRICES[plan_id]
    if (!priceConfig) {
      return Response.json({ error: 'Plan not configured' }, { status: 400 })
    }

    const priceId = priceConfig[period]
    if (!priceId) {
      return Response.json(
        { error: `Stripe price not configured for ${plan.name} (${period}). Set STRIPE_PRICE_${plan_id.toUpperCase().replace('_MONTHLY', '')}_${period === 'monthly' ? 'MONTHLY' : 'ANNUAL'} in environment variables.` },
        { status: 400 }
      )
    }

    // Check for existing active subscription
    const { data: existingSub } = await db
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'past_due'])
      .single()

    if (existingSub) {
      return Response.json(
        { error: 'You already have an active subscription. Please cancel it first or manage it from the billing page.' },
        { status: 400 }
      )
    }

    const customerId = await getOrCreateCustomer(user.id, user.email!, db)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        billing_period: period,
        credits_per_month: plan.credits.toString(),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          billing_period: period,
          credits_per_month: plan.credits.toString(),
        },
      },
      success_url: `${appUrl}/billing?success=true&type=subscription`,
      cancel_url: `${appUrl}/billing?canceled=true`,
    })

    return Response.json({ url: session.url })
  }

  // --- One-time credit pack checkout ---
  if (pack_id) {
    const pack = CREDIT_PACKS.find(p => p.id === pack_id)
    if (!pack) {
      return Response.json({ error: 'Invalid pack' }, { status: 400 })
    }

    const customerId = await getOrCreateCustomer(user.id, user.email!, db)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ApplyAgent ${pack.name} Pack`,
              description: `${pack.credits} credits`,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        credits: pack.credits.toString(),
      },
      success_url: `${appUrl}/billing?success=true`,
      cancel_url: `${appUrl}/billing?canceled=true`,
    })

    return Response.json({ url: session.url })
  }

  return Response.json({ error: 'Either pack_id or plan_id + billing_period required' }, { status: 400 })
}
