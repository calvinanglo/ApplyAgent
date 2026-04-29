/**
 * POST /api/webhooks/revenuecat
 *
 * Receives RevenueCat webhook events and syncs subscription/credit state to
 * Supabase. RevenueCat is the source of truth for App Store + Google Play
 * IAP transactions; Stripe remains the source of truth for web purchases.
 * Both write to the same `subscriptions` table (with provider column) and
 * the same credit_balances table.
 *
 * Security:
 *   - RC sends `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>` (a shared
 *     secret you configure in the RC dashboard).
 *   - We dedupe by event.id in the revenuecat_events table.
 *
 * Supported event types:
 *   INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE → upsert subscription
 *   CANCELLATION, EXPIRATION                  → mark subscription canceled/expired
 *   NON_RENEWING_PURCHASE                     → consumable credit pack: add_credits RPC
 *   BILLING_ISSUE                             → mark past_due
 *
 * RC docs: https://www.revenuecat.com/docs/webhooks
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

interface RcEvent {
  type: string
  id: string
  app_user_id?: string
  original_app_user_id?: string
  product_id?: string
  period_type?: string
  purchased_at_ms?: number
  expiration_at_ms?: number
  store?: string                     // 'APP_STORE' | 'PLAY_STORE' | ...
  environment?: string               // 'PRODUCTION' | 'SANDBOX'
  is_trial_conversion?: boolean
  cancel_reason?: string
  new_product_id?: string
  presented_offering_id?: string
  transaction_id?: string
  original_transaction_id?: string
  price?: number
  currency?: string
  subscriber_attributes?: Record<string, unknown>
}

interface RcWebhookBody {
  event: RcEvent
  api_version?: string
}

// Map RC product IDs → web plan ids (must match SUBSCRIPTION_PLANS in shared/credits.ts).
// Subscriptions:
const PRODUCT_TO_PLAN: Record<string, { plan_id: string; credits_per_month: number }> = {
  monthly_starter:  { plan_id: 'starter_monthly',      credits_per_month: 120 },
  monthly_growth:   { plan_id: 'growth_monthly',       credits_per_month: 300 },
  monthly_scale:    { plan_id: 'scale_monthly',        credits_per_month: 800 },
}
// Consumables:
const PRODUCT_TO_CREDITS: Record<string, number> = {
  credits_100: 100,
  credits_300: 300,
  credits_600: 600,
}

function isSubscriptionEvent(type: string): boolean {
  return ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'].includes(type)
}

export async function POST(request: Request) {
  // Auth check (shared secret in Authorization header — set in RC dashboard)
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH
  if (!expected) {
    console.error('[revenuecat] REVENUECAT_WEBHOOK_AUTH not configured')
    return new Response('Server misconfigured', { status: 500 })
  }
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader !== `Bearer ${expected}` && authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: RcWebhookBody
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const event = body?.event
  if (!event?.id || !event?.type) {
    return Response.json({ error: 'Missing event.id or event.type' }, { status: 400 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  const db = admin as any

  // Idempotency: skip if we've already processed this event.id
  const { data: existing } = await db
    .from('revenuecat_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle()
  if (existing) {
    return Response.json({ ok: true, deduped: true })
  }

  // Resolve user_id. RC's `app_user_id` is what we set via Purchases.configure({appUserID: user.id})
  const userId = event.app_user_id || event.original_app_user_id
  if (!userId) {
    // Anonymous purchase — record event, no-op user side
    await db.from('revenuecat_events').insert({ id: event.id, type: event.type, user_id: null, raw: event })
    return Response.json({ ok: true, anonymous: true })
  }

  try {
    // Skip sandbox events in production to avoid polluting real data
    if (event.environment === 'SANDBOX' && process.env.VERCEL_ENV === 'production') {
      await db.from('revenuecat_events').insert({ id: event.id, type: event.type, user_id: userId, raw: event })
      return Response.json({ ok: true, sandbox_skipped: true })
    }

    if (event.type === 'NON_RENEWING_PURCHASE' && event.product_id) {
      const credits = PRODUCT_TO_CREDITS[event.product_id]
      if (credits) {
        await db.rpc('add_credits', {
          p_user_id: userId,
          p_amount: credits,
          p_action: 'revenuecat_purchase',
        })
      }
    } else if (isSubscriptionEvent(event.type)) {
      const productId = event.new_product_id || event.product_id || ''
      const planMeta = PRODUCT_TO_PLAN[productId]

      let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active'
      if (event.type === 'CANCELLATION') status = 'canceled'
      else if (event.type === 'EXPIRATION') status = 'canceled'
      else if (event.type === 'BILLING_ISSUE') status = 'past_due'
      else if (event.period_type === 'TRIAL') status = 'trialing'

      const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null

      await db
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planMeta?.plan_id || productId || 'unknown',
          status,
          provider: 'revenuecat',
          external_id: event.original_transaction_id || event.transaction_id || event.id,
          current_period_end: periodEnd,
          cancel_at_period_end: event.type === 'CANCELLATION',
          credits_per_month: planMeta?.credits_per_month || null,
        }, { onConflict: 'user_id,provider,external_id' })

      // On INITIAL_PURCHASE or RENEWAL, top up the monthly credit allotment
      if ((event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') && planMeta?.credits_per_month) {
        await db.rpc('add_credits', {
          p_user_id: userId,
          p_amount: planMeta.credits_per_month,
          p_action: event.type === 'RENEWAL' ? 'revenuecat_renewal' : 'revenuecat_initial',
        })
      }
    }

    await db.from('revenuecat_events').insert({ id: event.id, type: event.type, user_id: userId, raw: event })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[revenuecat] processing failed:', err)
    // Don't record the event — let RC retry.
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }
}
