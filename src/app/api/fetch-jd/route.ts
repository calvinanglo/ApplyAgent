import { getApiClient } from '@/lib/supabase/api'
import { rateLimit } from '@/lib/rate-limit'
import { fetchJdFromUrl } from '@/app/api/pipeline/process/fetchers'

export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await getApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { success: withinLimit } = await rateLimit(`fetch-jd:${user.id}`, 15, 60_000)
  if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

  let body: { url: string }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

  if (!body.url || typeof body.url !== 'string') {
    return Response.json({ error: 'Missing URL' }, { status: 400 })
  }

  try {
    const result = await fetchJdFromUrl(body.url)
    return Response.json({ text: result.text, location: result.location })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to fetch job description' }, { status: 422 })
  }
}
