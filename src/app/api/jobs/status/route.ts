import { createClient } from '@/lib/supabase/server'

// Pure read — no Node.js APIs. Runs at the edge for lower latency on polling.
export const runtime = 'edge'

/**
 * GET /api/jobs/status?id=<job_id>
 *
 * Generic polling endpoint for background_jobs. Returns current status and,
 * once completed, the full result payload. RLS ensures users only see their
 * own jobs.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 })
  }

  const { data: job, error } = await db
    .from('background_jobs')
    .select('id, kind, status, result, error, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  return Response.json({
    id: job.id,
    kind: job.kind,
    status: job.status,
    error: job.error,
    result: job.status === 'completed' ? job.result : null,
    created_at: job.created_at,
  })
}
