/**
 * Remotive scraper — public JSON API.
 *
 * https://remotive.com/api/remote-jobs
 * No auth, no API key. Remote-only jobs worldwide.
 * Supports category and search params.
 */

import { ScannedJob, getRandomUserAgent, detectJobType, parseSalary } from './types'

const API_URL = 'https://remotive.com/api/remote-jobs'

export interface RemotiveSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface RemotiveJob {
  id?: number
  url?: string
  title?: string
  company_name?: string
  company_logo?: string
  category?: string
  tags?: string[]
  job_type?: string
  publication_date?: string
  candidate_required_location?: string
  salary?: string
  description?: string
}

interface RemotiveResponse {
  jobs?: RemotiveJob[]
}

export async function scrapeRemotive(params: RemotiveSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 1000

  try {
    const url = new URL(API_URL)
    if (params.keywords) url.searchParams.set('search', params.keywords)
    url.searchParams.set('limit', String(Math.min(maxResults, 2000)))

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return []

    const data: RemotiveResponse = await res.json()
    const rawJobs = data.jobs || []

    const jobs: ScannedJob[] = []
    for (const r of rawJobs) {
      if (jobs.length >= maxResults) break
      const job = mapJob(r)
      if (job) jobs.push(job)
    }

    return jobs
  } catch {
    return []
  }
}

function mapJob(r: RemotiveJob): ScannedJob | null {
  if (!r.title || !r.url) return null

  const salaryText = r.salary || null
  const parsed = parseSalary(salaryText || '', 'USD')

  // Normalize job type
  let job_type: string | null = null
  if (r.job_type) {
    const t = r.job_type.toLowerCase().replace('_', '-')
    if (t.includes('full')) job_type = 'full-time'
    else if (t.includes('part')) job_type = 'part-time'
    else if (t.includes('contract') || t.includes('freelance')) job_type = 'contract'
    else if (t.includes('intern')) job_type = 'internship'
  }
  if (!job_type) job_type = detectJobType(r.title) || 'full-time'

  return {
    title: r.title,
    url: r.url,
    company: r.company_name || 'Unknown',
    location: r.candidate_required_location || 'Remote',
    source: 'Remotive',
    posted_at: r.publication_date ? new Date(r.publication_date).toISOString() : null,
    job_type,
    work_arrangement: 'remote',
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
