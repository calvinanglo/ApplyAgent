import { createClient } from '@/lib/supabase/server'

// GET — get user's referral code and stats
export async function GET() {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Get or create referral code
    let { data: profile } = await db.from('profiles').select('referral_code').eq('id', user.id).single()
    if (!profile?.referral_code) {
      const code = user.id.slice(0, 8).toLowerCase()
      await db.from('profiles').update({ referral_code: code }).eq('id', user.id)
      profile = { referral_code: code }
    }

    // Count referrals
    const { count } = await db.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id)

    return Response.json({
      code: profile.referral_code,
      referrals: count || 0,
      link: `https://applyagent.ca/signup?ref=${profile.referral_code}`,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// POST — apply referral code (called during signup)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await request.json()
    if (!code) return Response.json({ error: 'No referral code provided' }, { status: 400 })

    // Check if user already used a referral
    const { data: existingRef } = await db.from('referrals').select('id').eq('referred_id', user.id).single()
    if (existingRef) return Response.json({ error: 'Referral already applied' }, { status: 400 })

    // Find referrer
    const { data: referrer } = await db.from('profiles').select('id').eq('referral_code', code.toLowerCase()).single()
    if (!referrer) return Response.json({ error: 'Invalid referral code' }, { status: 404 })
    if (referrer.id === user.id) return Response.json({ error: 'Cannot refer yourself' }, { status: 400 })

    // Create referral record
    await db.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referral_code: code.toLowerCase(),
      credits_awarded: true,
    })

    // Award 50 credits to both users atomically
    const REWARD = 50
    for (const uid of [referrer.id, user.id]) {
      const { data: bal } = await db.from('credit_balances').select('balance').eq('user_id', uid).single()
      const currentBalance = bal?.balance ?? 0
      await db.from('credit_balances').update({ balance: currentBalance + REWARD }).eq('user_id', uid)
      await db.from('credit_transactions').insert({
        user_id: uid,
        amount: REWARD,
        balance_after: currentBalance + REWARD,
        type: 'free_tier',
        action: 'referral',
        description: uid === user.id ? 'Referral bonus (signed up with code)' : 'Referral bonus (friend signed up)',
      })
    }

    // Mark on profile
    await db.from('profiles').update({ referred_by: code.toLowerCase() }).eq('id', user.id)

    return Response.json({ success: true, credits_awarded: REWARD })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
