import { getApiClient } from '@/lib/supabase/api'
import { getServiceClient } from '@/lib/background-job'

/**
 * GET /api/files/<userId>/<filename>
 *
 * Authenticated proxy for Supabase Storage downloads. Returns the file with
 * year-long immutable cache headers so Vercel's CDN serves repeat downloads
 * from edge cache instead of hitting Supabase Storage every time.
 *
 * Security:
 *   - Requires valid session cookie (auth check via Supabase)
 *   - Path must start with the authenticated user's own ID → no cross-user access
 *   - Downloads via service-role client (bypasses storage RLS; path scoping above
 *     provides the authorization boundary)
 *
 * Usage: replace direct Supabase public URLs with /api/files/<userId>/<filename>
 * in resume and cover-letter download flows.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Auth check
  const supabase = await getApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { path } = await params
  const filePath = path.join('/')

  // Users can only download their own files
  if (!filePath.startsWith(user.id + '/')) {
    return new Response('Forbidden', { status: 403 })
  }

  // Download from storage using service role (not affected by bucket RLS policies)
  const admin = getServiceClient() as any
  const { data, error } = await admin.storage
    .from('generated-files')
    .download(filePath)

  if (error || !data) {
    return new Response('Not found', { status: 404 })
  }

  const buffer = await data.arrayBuffer()
  const filename = filePath.split('/').pop() ?? 'download'
  const isPdf = filename.endsWith('.pdf')
  const isJson = filename.endsWith('.json')
  const contentType = isPdf
    ? 'application/pdf'
    : isJson
    ? 'application/json'
    : 'application/octet-stream'

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Files are content-addressed (name includes company+role+date) so they
      // are effectively immutable — safe to cache for 1 year at the edge.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
