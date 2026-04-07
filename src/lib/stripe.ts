import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return stripeClient
}

// One-time credit pack price IDs (legacy, using inline price_data instead)
export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  power_user: process.env.STRIPE_PRICE_POWER_USER || '',
}

// Subscription price IDs — create these in Stripe Dashboard
export const STRIPE_SUBSCRIPTION_PRICES: Record<string, { monthly: string; annually: string }> = {
  starter_monthly: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    annually: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
  },
  growth_monthly: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || '',
    annually: process.env.STRIPE_PRICE_GROWTH_ANNUAL || '',
  },
  scale_monthly: {
    monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY || '',
    annually: process.env.STRIPE_PRICE_SCALE_ANNUAL || '',
  },
}

// Get or create a Stripe customer for a user
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  db: any
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  // Create new Stripe customer
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  })

  // Save customer ID to profile
  await db
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}
