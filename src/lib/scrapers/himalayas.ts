/**
 * Himalayas scraper — public JSON API.
 *
 * https://himalayas.app/jobs/api
 * No auth. Curated remote jobs, strong tech focus.
 */

import { ScannedJob, getRandomUserAgent, detectJobType, parseSalary } from './types'

const API_URL = 'https://himalayas.app/jobs/api'

export interface HimalayasSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface HimalayasJob {
  guid?: string
  title?: string
  companyName?: string
  companyLogo?: string
  seniority?: string[]
  categories?: string[]
  locationRestrictions?: string[]
  applicationLink?: string
  companyDomain?: string
  pubDate?: string
  description?: string
  employmentType?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
}

interface HimalayasResponse {
  jobs?: HimalayasJob[]
}

export async function scrapeHimalayas(params: HimalayasSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 1000
  const keywordLower = params.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  try {
    const res = await fetch(API_URL, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return []

    const data: HimalayasResponse = await res.json()
    const rawJobs = data.jobs || []

    const jobs: ScannedJob[] = []
    const seen = new Set<string>()

    for (const r of rawJobs) {
      if (jobs.length >= maxResults) break
      const job = mapJob(r)
      if (!job) continue
      if (seen.has(job.url)) continue

      // Keyword filter
      if (keywordLower.length) {
        const haystack = `${job.title} ${job.company} ${(r.categories || []).join(' ')}`.toLowerCase()
        const matches = keywordLower.some(w => haystack.includes(w))
        if (!matches) continue
      }

      seen.add(job.url)
      jobs.push(job)
    }

    return jobs
  } catch {
    return []
  }
}

function mapJob(r: HimalayasJob): ScannedJob | null {
  const title = r.title
  const url = r.applicationLink
  if (!title || !url) return null

  // Normalize employment type
  let job_type: string | null = null
  if (r.employmentType) {
    const t = r.employmentType.toLowerCase()
    if (t.includes('full')) job_type = 'full-time'
    else if (t.includes('part')) job_type = 'part-time'
    else if (t.includes('contract') || t.includes('freelance')) job_type = 'contract'
    else if (t.includes('intern')) job_type = 'internship'
  }
  if (!job_type) job_type = detectJobType(title) || 'full-time'

  const location = (r.locationRestrictions || []).filter(Boolean).join(', ') || 'Remote'
  const salaryText = r.salaryMin && r.salaryMax
    ? `${r.salaryCurrency || '$'}${Math.round(r.salaryMin / 1000)}K–${Math.round(r.salaryMax / 1000)}K`
    : null
  const parsed = parseSalary(salaryText || '', r.salaryCurrency || 'USD')

  return {
    title,
    url,
    company: r.companyName || 'Unknown',
    location,
    source: 'Himalayas',
    posted_at: r.pubDate ? new Date(r.pubDate).toISOString() : null,
    job_type,
    work_arrangement: 'remote',
    salary: salaryText,
    salary_min: parsed.salary_min ?? r.salaryMin ?? null,
    salary_max: parsed.salary_max ?? r.salaryMax ?? null,
    salary_currency: parsed.salary_currency || r.salaryCurrency || 'USD',
  }
}
