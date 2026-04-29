/**
 * POST /api/auth/mobile/refresh
 *
 * Rotate an expired access token using a still-valid refresh token. Mobile
 * clients call this when they detect the access token is within 60s of
 * expiry, or after a 401 response from any other API route.
 *
 * Body: { refresh_token: string }
 */

import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

interface RefreshBody {
  refresh_token?: string
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = await rateLimit(`auth:refresh:${ip}`, 30, 60_000)
  if (!success) {
    return Response.json({ error: 'Too many refresh attempts.' }, { status: 429 })
  }

  let body: RefreshBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const refreshToken = body.refresh_token
  if (!refreshToken || refreshToken.length > 1024) {
    return Response.json({ error: 'refresh_token is required' }, { status: 400 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session) {
    return Response.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    user: data.user
      ? { id: data.user.id, email: data.user.email, created_at: data.user.created_at }
      : null,
  })
}
