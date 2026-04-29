/**
 * POST /api/push/register
 *
 * Mobile clients call this on sign-in (and on app launch when the token
 * rotates) to upsert their Expo push token. Tokens are scoped per
 * (user_id, device_id) so a user with multiple devices receives push on all
 * of them.
 *
 * Body: { token, device_id, platform, app_version? }
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getApiClient } from '@/lib/supabase/api'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

interface RegisterBody {
  token?: string
  device_id?: string
  platform?: string
  app_version?: string
}

export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await rateLimit(`push_register:${user.id}`, 20, 60_000)
  if (!success) return Response.json({ error: 'Too many requests' }, { status: 429 })

  let body: RegisterBody
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const token = body.token?.trim()
  const deviceId = body.device_id?.trim()
  const platform = body.platform?.trim().toLowerCase()
  const appVersion = body.app_version?.trim().slice(0, 32) || null

  if (!token || token.length > 256) {
    return Response.json({ error: 'token is required' }, { status: 400 })
  }
  if (!deviceId || !/^[a-zA-Z0-9_-]{8,128}$/.test(deviceId)) {
    return Response.json({ error: 'device_id is required (8-128 chars, alphanumeric)' }, { status: 400 })
  }
  if (platform !== 'ios' && platform !== 'android') {
    return Response.json({ error: 'platform must be ios or android' }, { status: 400 })
  }
  // Expo push tokens look like `ExponentPushToken[xxxxx]`. Be tolerant —
  // direct FCM/APNs tokens will be supported later if Expo Push is outgrown.
  if (!/^(ExponentPushToken\[|ExpoPushToken\[).{8,}\]$/.test(token) && !/^[A-Za-z0-9_-]{32,}$/.test(token)) {
    return Response.json({ error: 'token format invalid' }, { status: 400 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const db = admin as any
  const { error } = await db.from('expo_push_tokens').upsert({
    user_id: user.id,
    device_id: deviceId,
    token,
    platform,
    app_version: appVersion,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,device_id' })

  if (error) {
    console.error('push_register insert failed:', error.message)
    return Response.json({ error: 'Failed to register push token' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
