import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Background job helper. Used by long-running routes (cover-letter, resume PDF,
 * etc.) to decouple work from the HTTP request lifetime so it survives mobile
 * tab suspension. The route inserts a pending job, kicks off work inside
 * `after()`, and the worker updates status via the service role client.
 */

export type JobKind = 'cover_letter' | 'resume_pdf' | 'scan' | 'pipeline_process'
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
