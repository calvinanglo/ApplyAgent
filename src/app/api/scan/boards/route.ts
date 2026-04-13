/**
 * Job Board Search API — searches LinkedIn, Talent.com, CareerJet, Google, and Jooble.
 * Separate from the ATS portal scanner (/api/scan) which scans company career pages.
 */

import { createClient } from '@/lib/supabase/server'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'
import { scrapeLinkedIn } from '@/lib/scrapers/linkedin'
import { scrapeTalent } from '@/lib/scrapers/talent'
import { scrapeCareerJet } from '@/lib/scrapers/careerjet'
import { scrapeJooble } from '@/lib/scrapers/jooble'
import {
  type ScannedJob,
  titleMatches,
  filterByDate,
  filterByJobType,
  filterByWorkArrangement,
  filterByLocation,
  filterBySalary,
} from '@/lib/scrapers/types'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = await rateLimit(`board_search:${user.id}`, 3, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many searches. Please wait a moment.' }, { status: 429 })

    let body: {
      keywords: string
      location: string
      sources?: ('linkedin' | 'talent' | 'careerjet' | 'jooble')[]
      target_roles?: string[]
      filters?: {
        job_types?: string[]
        work_arrangement?: string[]
        date_posted?: string
        location?: string
        salary_min?: number
        salary_currency?: string
      }
    }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    if (!body.keywords?.trim()) return Response.json({ error: 'Keywords required' }, { status: 400 })
    if (!body.location?.trim()) return Response.json({ error: 'Location required' }, { status: 400 })
    if (body.keywords.length > 200) return Response.json({ error: 'Keywords too long' }, { status: 400 })
    if (body.location.length > 100) return Response.json({ error: 'Location too long' }, { status: 400 })

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

    // Deduct credits
    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.board_search,
      p_action: 'board_search',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    // Get existing pipeline URLs + applications for dedup
    const [existingItemsRes, existingAppsRes] = await Promise.all([
      db.from('pipeline_items').select('url').eq('user_id', user.id),
      db.from('applications').select('company, role').eq('user_id', user.id),
    ])
    const existingUrls = new Set((existingItemsRes.data || []).map((i: any) => i.url))
    const existingApps = existingAppsRes.data || []

    // Run scrapers in parallel
    const sources = body.sources || ['linkedin', 'talent', 'careerjet', 'jooble']
    const sourceStats: Record<string, { found: number; error: boolean }> = {}

    const scraperMap: Record<string, (p: { keywords: string; location: string }) => Promise<ScannedJob[]>> = {
      linkedin: scrapeLinkedIn,
      talent: scrapeTalent,
      careerjet: scrapeCareerJet,
      jooble: scrapeJooble,
    }

    const promises: Promise<{ source: string; jobs: ScannedJob[] }>[] = []
    for (const src of sources) {
      const scraper = scraperMap[src]
      if (!scraper) continue
      promises.push(
        scraper({ keywords: body.keywords, location: body.location })
          .then(jobs => { sourceStats[src] = { found: jobs.length, error: false }; return { source: src, jobs } })
          .catch(() => { sourceStats[src] = { found: 0, error: true }; return { source: src, jobs: [] } })
      )
    }

    const results = await Promise.all(promises)

    // Collect and cross-source dedupe
    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()
    let allJobs: ScannedJob[] = []

    for (const { jobs } of results) {
      for (const job of jobs) {
        const urlKey = job.url.toLowerCase()
        const titleKey = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`
        if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue
        seenUrls.add(urlKey)
        seenTitles.add(titleKey)
        allJobs.push(job)
      }
    }

    const totalFound = allJobs.length
    let skippedTitle = 0
    let skippedFilters = 0
    let skippedDup = 0

    // Title matching filter
    const titleFiltered = allJobs.filter(job => {
      const matches = titleMatches(job.title, targetRoles)
      if (!matches) skippedTitle++
      return matches
    })

    // Apply user filters
    let filtered = titleFiltered
    if (body.filters?.date_posted) {
      const before = filtered.length
      filtered = filterByDate(filtered, body.filters.date_posted)
      skippedFilters += before - filtered.length
    }
    if (body.filters?.job_types?.length) {
      const before = filtered.length
      filtered = filterByJobType(filtered, body.filters.job_types)
      skippedFilters += before - filtered.length
    }
    if (body.filters?.work_arrangement?.length) {
      const before = filtered.length
      filtered = filterByWorkArrangement(filtered, body.filters.work_arrangement)
      skippedFilters += before - filtered.length
    }
    if (body.filters?.location) {
      const before = filtered.length
      filtered = filterByLocation(filtered, body.filters.location)
      skippedFilters += before - filtered.length
    }
    if (body.filters?.salary_min) {
      const before = filtered.length
      filtered = filterBySalary(filtered, body.filters.salary_min, body.filters.salary_currency || 'CAD')
      skippedFilters += before - filtered.length
    }

    // Dedupe against existing pipeline items and applications
    const newJobs = filtered.filter(job => {
      if (existingUrls.has(job.url)) { skippedDup++; return false }
      const titleNorm = job.title.toLowerCase().trim()
      const companyNorm = job.company.toLowerCase().trim()
      const isDup = existingApps.some((app: any) =>
        app.company?.toLowerCase().trim() === companyNorm &&
        (app.role?.toLowerCase().trim() === titleNorm || titleNorm.includes(app.role?.toLowerCase().trim() || ''))
      )
      if (isDup) { skippedDup++; return false }
      return true
    })

    // Insert into pipeline
    if (newJobs.length > 0) {
      await db.from('pipeline_items').insert(
        newJobs.map(job => ({
          user_id: user.id,
          url: job.url,
          company: job.company,
          title: job.title,
          location: job.location || null,
          source: job.source,
          status: 'pending',
        }))
      )
    }

    return Response.json({
      success: true,
      stats: {
        found: totalFound,
        filtered: newJobs.length,
        skipped_title: skippedTitle,
        skipped_filters: skippedFilters,
        skipped_dup: skippedDup,
        added: newJobs.length,
        source_stats: sourceStats,
      },
      new_items: newJobs.slice(0, 50), // cap response size
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
