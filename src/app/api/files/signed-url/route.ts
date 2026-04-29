/**
 * POST /api/files/signed-url
 *
 * Returns a short-lived (60s) Supabase Storage signed URL so mobile clients
 * can download generated resumes / cover letters directly from Supabase
 * (avoiding a Vercel proxy hop and enabling resumable native downloads).
 *
 * Body: { path: string, bucket?: string }   // path must start with userId/
 * Response: { url: string, expires_at: string }
 *
 * Auth: Bearer or cookie. Path traversal is prevented by enforcing that
 * `path` starts with the authenticated user's ID followed by a slash.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getApiClient } from '@/lib/supabase/api'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

const ALLOWED_BUCKETS = new Set(['generated-files'])
const SIGNED_URL_EXPIRES_SECONDS = 60

export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await rateLimit(`signed_url:${user.id}`, 60, 60_000)
  if (!success) return Response.json({ error: 'Too many requests' }, { status: 429 })

  let body: { path?: string; bucket?: string }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const path = body.path?.trim()
  const bucket = (body.bucket || 'generated-files').trim()
  if (!path) return Response.json({ error: 'path is required' }, { status: 400 })
  if (!ALLOWED_BUCKETS.has(bucket)) return Response.json({ error: 'Invalid bucket' }, { status: 400 })

  // Path traversal + ownership guard: must start with `${user.id}/` and
  // contain no `..` segments.
  if (path.includes('..') || path.startsWith('/')) {
    return Response.json({ error: 'Invalid path' }, { status: 400 })
  }
  const ownedPrefix = `${user.id}/`
  if (!path.startsWith(ownedPrefix)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use admin client because the `generated-files` bucket is configured for
  // service-role access (same pattern as /api/files/[...path]).
  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_SECONDS)

  if (error || !data?.signedUrl) {
    return Response.json({ error: error?.message || 'File not found' }, { status: 404 })
  }

  return Response.json({
    url: data.signedUrl,
    expires_at: new Date(Date.now() + SIGNED_URL_EXPIRES_SECONDS * 1000).toISOString(),
  })
}
