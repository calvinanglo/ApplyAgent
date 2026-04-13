import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Postgres-backed rate limiter. Works correctly across all serverless
 * instances — no in-memory state that resets on cold starts or deploys.
 *
 * Fails open on any DB error so infrastructure issues never lock users out.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  try {
    const admin = getAdminClient()
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key:            key,
      p_max_count:      limit,
      p_window_seconds: Math.floor(windowMs / 1000),
    })
    if (error) {
      console.warn('Rate limit check error (allowing):', error.message)
      return { success: true, remaining: limit - 1 }
    }
    const allowed = Boolean(data)
    return { success: allowed, remaining: allowed ? limit - 1 : 0 }
  } catch {
    // Fail open — never block users due to DB unavailability
    return { success: true, remaining: limit - 1 }
  }
}
