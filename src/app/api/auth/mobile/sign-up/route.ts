/**
 * POST /api/auth/mobile/sign-up
 *
 * Mobile email/password sign-up. Mirrors signInWithPassword response shape.
 * Email confirmation is governed by the Supabase project's auth settings —
 * if "Confirm email" is enabled, `data.session` will be null until the user
 * clicks the confirmation link, and we return a flag so the mobile UI can
 * route to a "check your inbox" screen.
 *
 * Body: { email, password, full_name? }
 */

import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

interface SignUpBody {
  email?: string
  password?: string
  full_name?: string
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = await rateLimit(`auth:signup:${ip}`, 5, 60_000)
  if (!success) {
    return Response.json({ error: 'Too many sign-up attempts. Please wait a moment.' }, { status: 429 })
  }

  let body: SignUpBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const fullName = body.full_name?.trim().slice(0, 100)
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (email.length > 254 || password.length < 8 || password.length > 200) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  })
  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // If confirmation is required, session will be null.
  if (!data.session) {
    return Response.json({
      requires_email_confirmation: true,
      user: data.user
        ? { id: data.user.id, email: data.user.email, created_at: data.user.created_at }
        : null,
    })
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
