import { createClient } from '@/lib/supabase/server'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'
import {
  type ScannedJob,
  titleMatches,
  detectWorkArrangement,
  detectJobType,
  filterByDate,
  filterByJobType,
  filterByWorkArrangement,
  filterByLocation,
  filterBySalary,
} from '@/lib/scrapers/types'

// --- ATS Fetchers ---

async function scanGreenhouse(slug: string, company: string): Promise<ScannedJob[]> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { jobs?: Array<{ title: string; absolute_url: string; location?: { name: string }; updated_at?: string }> }
    return (data.jobs || []).map(job => {
      const location = job.location?.name || null
      return {
        title: job.title,
        url: job.absolute_url,
        company,
        location,
        source: `Greenhouse (${company})`,
        posted_at: job.updated_at || null,
        job_type: detectJobType(job.title),
        work_arrangement: detectWorkArrangement(job.title, location),
      }
    })
  } catch {
    return []
  }
}

async function scanLever(slug: string, company: string): Promise<ScannedJob[]> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as Array<{
      text: string
      hostedUrl: string
      createdAt: number
      categories: { location?: string; commitment?: string; team?: string }
    }>
    if (!Array.isArray(data)) return []
    return data.map(job => {
      const location = job.categories?.location || null
      const commitment = job.categories?.commitment?.toLowerCase() || ''
      // Lever provides commitment natively: Full-time, Part-time, Contract, Intern, etc.
      let jobType: string | null = null
      if (commitment.includes('full')) jobType = 'full-time'
      else if (commitment.includes('part')) jobType = 'part-time'
      else if (commitment.includes('contract')) jobType = 'contract'
      else if (commitment.includes('temp')) jobType = 'temporary'
      else if (commitment.includes('intern')) jobType = null // will be filtered by negative filters
      else if (commitment) jobType = commitment

      return {
        title: job.text,
        url: job.hostedUrl,
        company,
        location,
        source: `Lever (${company})`,
        posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : null,
        job_type: jobType || detectJobType(job.text),
        work_arrangement: detectWorkArrangement(job.text, location),
      }
    })
  } catch {
    return []
  }
}

async function scanAshby(slug: string, company: string): Promise<ScannedJob[]> {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { jobs?: Array<{
      title: string
      jobUrl: string
      location: string
      employmentType?: string
      publishedAt?: string
    }> }
    return (data.jobs || []).map(job => {
      const empType = job.employmentType?.toLowerCase() || ''
      let jobType: string | null = null
      if (empType.includes('full')) jobType = 'full-time'
      else if (empType.includes('part')) jobType = 'part-time'
      else if (empType.includes('contract')) jobType = 'contract'
      else if (empType.includes('temp')) jobType = 'temporary'
      else if (empType) jobType = empType

      return {
        title: job.title,
        url: job.jobUrl,
        company,
        location: job.location || null,
        source: `Ashby (${company})`,
        posted_at: job.publishedAt || null,
        job_type: jobType || detectJobType(job.title),
        work_arrangement: detectWorkArrangement(job.title, job.location),
      }
    })
  } catch {
    return []
  }
}

async function scanSmartRecruiters(slug: string, company: string): Promise<ScannedJob[]> {
  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { content?: Array<{
      name: string
      ref: string
      releasedDate?: string
      location?: { city?: string; region?: string; country?: string; remote?: boolean; hybrid?: boolean; fullLocation?: string }
      typeOfEmployment?: { id?: string; label?: string }
    }> }
    return (data.content || []).map(job => {
      const loc = job.location
      const locStr = loc?.fullLocation || [loc?.city, loc?.region, loc?.country].filter(Boolean).join(', ') || null
      const empType = job.typeOfEmployment?.label?.toLowerCase() || ''
      let jobType: string | null = null
      if (empType.includes('full')) jobType = 'full-time'
      else if (empType.includes('part')) jobType = 'part-time'
      else if (empType.includes('contract')) jobType = 'contract'
      else if (empType.includes('temp')) jobType = 'temporary'
      else if (empType) jobType = empType

      let arrangement: string | null = null
      if (loc?.remote) arrangement = 'remote'
      else if (loc?.hybrid) arrangement = 'hybrid'
      else arrangement = detectWorkArrangement(job.name, locStr)

      return {
        title: job.name,
        url: job.ref,
        company,
        location: locStr,
        source: `SmartRecruiters (${company})`,
        posted_at: job.releasedDate || null,
        job_type: jobType || detectJobType(job.name),
        work_arrangement: arrangement,
      }
    })
  } catch {
    return []
  }
}

async function scanWorkday(slug: string, company: string): Promise<ScannedJob[]> {
  // Workday slug format: "subdomain/wd#/siteId" e.g. "nvidia/wd5/NVIDIAExternalCareerSite"
  const parts = slug.split('/')
  if (parts.length < 3) return []
  const [subdomain, wd, siteId] = parts
  try {
    const res = await fetch(`https://${subdomain}.${wd}.myworkdayjobs.com/wday/cxs/${subdomain}/${siteId}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      body: JSON.stringify({ appliedFacets: {}, limit: 100, offset: 0, searchText: '' }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { jobPostings?: Array<{
      title: string
      externalPath: string
      locationsText?: string
      postedOn?: string
    }> }
    return (data.jobPostings || []).map(job => {
      const url = `https://${subdomain}.${wd}.myworkdayjobs.com${siteId ? '/' + siteId : ''}${job.externalPath}`
      return {
        title: job.title,
        url,
        company,
        location: job.locationsText || null,
        source: `Workday (${company})`,
        posted_at: null,
        job_type: detectJobType(job.title),
        work_arrangement: detectWorkArrangement(job.title, job.locationsText || null),
      }
    })
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

    const { success: withinLimit } = rateLimit(`scan:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many scans. Please wait a moment.' }, { status: 429 })

    let body: {
      companies?: Array<{ name: string; slug?: string | null; platform?: string; greenhouse_slug?: string | null }>
      custom_urls?: string[]
      target_roles?: string[]
      filters?: {
        job_types?: string[]
        work_arrangement?: string[]
        date_posted?: string
        location?: string
        salary_min?: number
      }
    }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Use target roles from request body, fall back to profile
    let targetRoles: string[] = body.target_roles || []
    if (!targetRoles.length) {
      const { data: profile } = await db
        .from('profiles')
        .select('target_roles')
        .eq('id', user.id)
        .single()
      targetRoles = profile?.target_roles || []
    }

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

    const allJobs: ScannedJob[] = []
    const companies = (body.companies || []).slice(0, 50) // Cap at 50 companies
    const filters = body.filters || {}

    // Scan all 3 platforms for each company in parallel
    // If platform is specified, use only that one. Otherwise, try all 3.
    const scanPromises = companies.flatMap((c) => {
      const slug = c.slug || c.greenhouse_slug
      if (!slug) return []

      if (c.platform) {
        // Platform explicitly set — use only that one
        switch (c.platform) {
          case 'lever': return [scanLever(slug, c.name)]
          case 'ashby': return [scanAshby(slug, c.name)]
          case 'smartrecruiters': return [scanSmartRecruiters(slug, c.name)]
          case 'workday': return [scanWorkday(slug, c.name)]
          default: return [scanGreenhouse(slug, c.name)]
        }
      }

      // No platform specified — try all 4 in parallel
      return [
        scanGreenhouse(slug, c.name),
        scanLever(slug, c.name),
        scanAshby(slug, c.name),
        scanSmartRecruiters(slug, c.name),
      ]
    })

    const results = await Promise.allSettled(scanPromises)
    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          // Deduplicate across platforms by URL and by company+title
          const titleKey = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`
          if (seenUrls.has(job.url) || seenTitles.has(titleKey)) continue
          seenUrls.add(job.url)
          seenTitles.add(titleKey)
          allJobs.push(job)
        }
      }
    }

    // Add custom URLs as pipeline items directly
    const customUrls = (body.custom_urls || []).filter(url => url.trim())
    let customUrlsAdded = 0

    // Apply filters
    let filtered = allJobs

    // 1. Title matching (target roles + negative filters)
    filtered = filtered.filter(job => titleMatches(job.title, targetRoles))
    const skippedTitle = allJobs.length - filtered.length

    // 2. Date filter
    filtered = filterByDate(filtered, filters.date_posted || 'any')

    // 3. Job type filter
    filtered = filterByJobType(filtered, filters.job_types || [])

    // 4. Work arrangement filter
    filtered = filterByWorkArrangement(filtered, filters.work_arrangement || [])

    // 5. Location filter
    filtered = filterByLocation(filtered, filters.location || '')

    // 6. Salary filter
    if (filters.salary_min) filtered = filterBySalary(filtered, filters.salary_min)

    const skippedFilters = allJobs.length - skippedTitle - filtered.length

    // Dedup
    const newJobs = filtered.filter(job => {
      if (existingUrls.has(job.url)) return false
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
          location: job.location || null,
          status: 'pending',
        }))
      )
    }

    // Add custom URLs to pipeline (validate format, limit count)
    if (customUrls.length > 100) {
      return Response.json({ error: 'Maximum 100 custom URLs per scan' }, { status: 400 })
    }
    if (customUrls.length > 0) {
      const validUrls = customUrls.filter((url: string) => {
        try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol) } catch { return false }
      })
      const newCustomUrls = validUrls.filter((url: string) => !existingUrls.has(url))
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
        customUrlsAdded = newCustomUrls.length
      }
    }

    return Response.json({
      success: true,
      stats: {
        found: allJobs.length + customUrls.length,
        filtered: filtered.length,
        skipped_title: skippedTitle,
        skipped_filters: skippedFilters,
        skipped_dup: skippedDup + (customUrls.length - customUrlsAdded),
        added: newJobs.length + customUrlsAdded,
      },
      new_items: [
        ...newJobs,
        ...customUrls.slice(0, customUrlsAdded).map(url => ({ title: url, url, company: 'Manual URL', source: 'manual' })),
      ],
    })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
