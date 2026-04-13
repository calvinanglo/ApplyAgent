import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

/**
 * GET /api/evaluate/status?id=<job_id>
 *
 * Polling endpoint for evaluation jobs. Returns the current status plus the
 * full result once status === 'completed'. Client uses this to resume after
 * mobile tab suspension or network drops.
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
    .from('evaluation_jobs')
    .select('id, status, result, error, score, archetype, report_id, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  return Response.json({
    id: job.id,
    status: job.status,
    error: job.error,
    score: job.score,
    archetype: job.archetype,
    report_id: job.report_id,
    result: job.status === 'completed' ? job.result : null,
    created_at: job.created_at,
  })
}
