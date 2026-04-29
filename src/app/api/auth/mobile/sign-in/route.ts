/**
 * POST /api/auth/mobile/sign-in
 *
 * Mobile email/password sign-in. Returns Supabase session tokens that the
 * mobile client stores in expo-secure-store and sends as Authorization:
 * Bearer on subsequent API calls.
 *
 * Body: { email: string, password: string }
 * Response: { access_token, refresh_token, expires_at, expires_in, user }
 */

import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

interface SignInBody {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  // IP-based rate limit (10 attempts / minute / IP) — guards against
  // credential stuffing without locking out legit users on shared IPs too hard.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = await rateLimit(`auth:signin:${ip}`, 10, 60_000)
  if (!success) {
    return Response.json({ error: 'Too many sign-in attempts. Please wait a moment.' }, { status: 429 })
  }

  let body: SignInBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (email.length > 254 || password.length > 200) {
    return Response.json({ error: 'Invalid credentials' }, { status: 400 })
  }

  // Use a plain anon client — we don't want to set cookies for mobile flow.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    // Use a generic message to avoid leaking which accounts exist.
    return Response.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at, // unix timestamp seconds
    expires_in: data.session.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
    },
  })
}
