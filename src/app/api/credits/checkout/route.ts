import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { CREDIT_PACKS } from '@/lib/credits'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pack_id } = await request.json()
  const pack = CREDIT_PACKS.find(p => p.id === pack_id)

  if (!pack) {
    return Response.json({ error: 'Invalid pack' }, { status: 400 })
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `CareerOps ${pack.name} Pack`,
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
