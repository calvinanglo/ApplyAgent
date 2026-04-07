import { createClient } from '@/lib/supabase/server'
import { CREDIT_COSTS } from '@/lib/credits'

const NEGATIVE_FILTERS = [
  'intern', 'student', 'co-op', 'junior', 'entry-level', 'director', 'VP',
  'chief', 'C-suite', 'principal', 'managing director', 'head of',
]

function titleMatches(title: string, targetRoles: string[]): boolean {
  const t = title.toLowerCase()
  const hasNegative = NEGATIVE_FILTERS.some(kw => t.includes(kw.toLowerCase()))
  if (hasNegative) return false
  // If user has no target roles, show all (except negative-filtered)
  if (targetRoles.length === 0) return true
  // Check if title matches any of the user's target role keywords
  return targetRoles.some(role => {
    const words = role.toLowerCase().split(/\s+/)
    return words.some(word => word.length > 2 && t.includes(word))
  })
}

async function scanGreenhouse(slug: string, company: string): Promise<Array<{ title: string; url: string; company: string }>> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { jobs?: Array<{ title: string; absolute_url: string }> }
    return (data.jobs || []).map(job => ({
      title: job.title,
      url: job.absolute_url,
      company,
    }))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: {
      companies?: Array<{ name: string; greenhouse_slug?: string | null; careers_url?: string }>
      custom_urls?: string[]
    }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Load user's profile for target roles filtering
    const { data: profile } = await db
      .from('profiles')
      .select('target_roles')
      .eq('id', user.id)
      .single()
    const targetRoles: string[] = profile?.target_roles || []

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.portal_scan,
      p_action: 'portal_scan',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    // Get existing pipeline URLs for dedup
    const { data: existingItems } = await db
      .from('pipeline_items')
      .select('url')
      .eq('user_id', user.id)
    const existingUrls = new Set((existingItems || []).map((i: any) => i.url))

    // Get existing applications for dedup
    const { data: existingApps } = await db
      .from('applications')
      .select('company, role')
      .eq('user_id', user.id)

    const foundJobs: Array<{ title: string; url: string; company: string; source: string }> = []
    const companies = body.companies || []

    // Scan Greenhouse APIs
    const greenhouseResults = await Promise.allSettled(
      companies
        .filter(c => c.greenhouse_slug)
        .map(async (c) => {
          const jobs = await scanGreenhouse(c.greenhouse_slug!, c.name)
          return jobs.map(j => ({ ...j, source: `Greenhouse (${c.name})` }))
        })
    )

    for (const result of greenhouseResults) {
      if (result.status === 'fulfilled') {
        foundJobs.push(...result.value)
      }
    }

    // Add custom URLs as pipeline items directly
    const customUrls = (body.custom_urls || []).filter(url => url.trim())

    // Filter by title using user's target roles
    const filtered = foundJobs.filter(job => titleMatches(job.title, targetRoles))
    const skippedTitle = foundJobs.length - filtered.length

    // Dedup
    const newJobs = filtered.filter(job => {
      if (existingUrls.has(job.url)) return false
      // Check if company+role similar already exists
      const companyNorm = job.company.toLowerCase().trim()
      const titleNorm = job.title.toLowerCase().trim()
      const isDup = (existingApps || []).some((app: any) => {
        return app.company?.toLowerCase().trim() === companyNorm &&
          (app.role?.toLowerCase().trim() === titleNorm || titleNorm.includes(app.role?.toLowerCase().trim() || ''))
      })
      return !isDup
    })

    const skippedDup = filtered.length - newJobs.length

    // Add new jobs to pipeline
    if (newJobs.length > 0) {
      await db.from('pipeline_items').insert(
        newJobs.map(job => ({
          user_id: user.id,
          url: job.url,
          company: job.company,
          title: job.title,
          source: job.source,
          status: 'pending',
        }))
      )
    }

    // Add custom URLs to pipeline
    if (customUrls.length > 0) {
      const newCustomUrls = customUrls.filter((url: string) => !existingUrls.has(url))
      if (newCustomUrls.length > 0) {
        await db.from('pipeline_items').insert(
          newCustomUrls.map((url: string) => ({
            user_id: user.id,
            url,
            company: null,
            title: null,
            source: 'manual',
            status: 'pending',
          }))
        )
      }
    }

    return Response.json({
      success: true,
      stats: {
        found: foundJobs.length,
        filtered: filtered.length,
        skipped_title: skippedTitle,
        skipped_dup: skippedDup,
        added: newJobs.length,
      },
      new_items: newJobs,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
