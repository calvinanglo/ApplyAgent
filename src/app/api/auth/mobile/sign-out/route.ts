/**
 * POST /api/auth/mobile/sign-out
 *
 * Revoke the user's refresh token server-side. Mobile clients should also
 * clear local SecureStore tokens after this returns. Idempotent — safe to
 * call even if the token is already revoked.
 */

import { createClient } from '@supabase/supabase-js'
import { getApiClient } from '@/lib/supabase/api'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Already signed out / invalid token. No-op success.
    return Response.json({ ok: true })
  }

  // Revoke the refresh token via the admin API so it can't be re-used.
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  try {
    await admin.auth.admin.signOut(user.id, 'global')
  } catch {
    // Best-effort revocation. Mobile client clears local tokens regardless.
  }

  return Response.json({ ok: true })
}
