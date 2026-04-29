/**
 * Dual-auth Supabase client for API routes.
 *
 * Returns a Supabase client authenticated via either:
 *   1. Authorization: Bearer <access_token>  (mobile / programmatic clients)
 *   2. Cookie session                         (web SSR — same as createClient())
 *
 * This is backwards-compatible with the existing `createClient()` used by
 * cookie-based web routes. Routes can migrate to `getApiClient(request)`
 * one at a time without breaking the web app.
 *
 * Usage in a route:
 *   export async function POST(request: Request) {
 *     const supabase = await getApiClient(request)
 *     const { data: { user } } = await supabase.auth.getUser()
 *     ...
 *   }
 */

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getApiClient(request: Request) {
  // 1. Bearer token path (mobile clients)
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      // Plain client with the user's access token forwarded as the Authorization
      // header on every request. Supabase's PostgREST + Auth endpoints honor the
      // header and apply RLS as the authenticated user.
      return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    }
  }

  // 2. Cookie path (web SSR — identical to createClient())
  const cookieStore = await cookies()
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component context — middleware refreshes the session.
        }
      },
    },
  })
}

/**
 * Stable device identifier sent by mobile clients via X-Device-Id header.
 * Used to scope rate-limit keys per device so a phone and a browser don't
 * starve each other. Returns 'web' for cookie-only requests.
 */
export function getDeviceId(request: Request): string {
  const id = request.headers.get('x-device-id') || request.headers.get('X-Device-Id')
  if (id && /^[a-zA-Z0-9_-]{8,128}$/.test(id)) return id
  return 'web'
}
