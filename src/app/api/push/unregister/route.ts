/**
 * POST /api/push/unregister
 *
 * Called by mobile clients on sign-out. Deletes the (user_id, device_id)
 * row so the user stops receiving push on that device.
 *
 * Body: { device_id: string }
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getApiClient } from '@/lib/supabase/api'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { device_id?: string }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const deviceId = body.device_id?.trim()
  if (!deviceId || !/^[a-zA-Z0-9_-]{8,128}$/.test(deviceId)) {
    return Response.json({ error: 'device_id is required' }, { status: 400 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const db = admin as any
  await db.from('expo_push_tokens').delete().eq('user_id', user.id).eq('device_id', deviceId)

  return Response.json({ ok: true })
}
