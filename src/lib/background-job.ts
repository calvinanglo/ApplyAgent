import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Background job helper. Used by long-running routes (cover-letter, resume PDF,
 * etc.) to decouple work from the HTTP request lifetime so it survives mobile
 * tab suspension. The route inserts a pending job, kicks off work inside
 * `after()`, and the worker updates status via the service role client.
 */

export type JobKind = 'cover_letter' | 'resume_pdf' | 'scan' | 'pipeline_process' | 'evaluation'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createJob(
  db: any,
  userId: string,
  kind: JobKind,
  input: Record<string, unknown>
): Promise<string | null> {
  const { data, error } = await db
    .from('background_jobs')
    .insert({ user_id: userId, kind, status: 'pending', input })
    .select('id')
    .single()
  if (error || !data) return null
  return data.id as string
}

export async function updateJob(
  jobId: string,
  patch: { status?: JobStatus; result?: unknown; error?: string }
) {
  const admin = getServiceClient() as any
  await admin.from('background_jobs').update(patch).eq('id', jobId)
}

export async function failJob(jobId: string, error: string) {
  await updateJob(jobId, { status: 'failed', error })
}

export async function completeJob(jobId: string, result: unknown) {
  await updateJob(jobId, { status: 'completed', result })
}

export async function startJob(jobId: string) {
  await updateJob(jobId, { status: 'running' })
}

/**
 * Returns true if the user has fewer than maxJobs active (pending | running)
 * background jobs. Call BEFORE createJob to prevent one user from flooding
 * the queue.
 */
export async function checkUserConcurrency(
  db: any,
  userId: string,
  maxJobs = 3
): Promise<boolean> {
  const { count } = await db
    .from('background_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'running'])
  return (count ?? 0) < maxJobs
}

/**
 * Returns true if the total number of active jobs org-wide is under maxJobs.
 * Prevents thundering-herd overload on the Anthropic API during traffic spikes.
 */
export async function checkGlobalConcurrency(maxJobs = 15): Promise<boolean> {
  const admin = getServiceClient() as any
  const { count } = await admin
    .from('background_jobs')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'running'])
  return (count ?? 0) < maxJobs
}
