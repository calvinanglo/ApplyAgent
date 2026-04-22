/**
 * FindWork scraper — public JSON API.
 *
 * https://findwork.dev/api/jobs/
 * Free tier with API key (FINDWORK_API_KEY env var).
 * Curated remote + tech jobs, strong developer focus.
 */

import { ScannedJob, getRandomUserAgent, detectJobType, parseSalary, delay } from './types'

const API_URL = 'https://findwork.dev/api/jobs/'
const MAX_PAGES = 5
const DELAY_MS = 300

export interface FindWorkSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface FindWorkJob {
  id?: number
  role?: string
  company_name?: string
  company_num_employees?: string
  employment_type?: string
  location?: string
  remote?: boolean
  logo?: string
  url?: string
  text?: string
  date_posted?: string
  keywords?: string[]
  source?: string
}

interface FindWorkResponse {
  count?: number
  next?: string | null
  previous?: string | null
  results?: FindWorkJob[]
}

export async function scrapeFindWork(params: FindWorkSearchParams): Promise<ScannedJob[]> {
  const apiKey = process.env.FINDWORK_API_KEY
  if (!apiKey) return []

  const maxResults = params.maxResults || 500
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  let nextUrl: string | null = null

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      let url: URL
      if (nextUrl) {
        url = new URL(nextUrl)
      } else {
        url = new URL(API_URL)
        url.searchParams.set('search', params.keywords)
        if (params.location && !/remote/i.test(params.location)) {
          url.searchParams.set('location', params.location)
        }
        url.searchParams.set('sort_by', 'date')
      }

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const data: FindWorkResponse = await res.json()
      const results = data.results || []
      if (!results.length) break

      let newCount = 0
      for (const r of results) {
        if (jobs.length >= maxResults) break
        const job = mapJob(r)
        if (job && !seen.has(job.url)) {
          seen.add(job.url)
          jobs.push(job)
          newCount++
        }
      }

      nextUrl = data.next || null
      if (!nextUrl || newCount === 0) break
    } catch {
      break
    }
  }

  return jobs
}

function mapJob(r: FindWorkJob): ScannedJob | null {
  const title = r.role
  const url = r.url
  if (!title || !url) return null

  let job_type: string | null = null
  if (r.employment_type) {
    const t = r.employment_type.toLowerCase()
    if (t.includes('full')) job_type = 'full-time'
    else if (t.includes('part')) job_type = 'part-time'
    else if (t.includes('contract') || t.includes('freelance')) job_type = 'contract'
    else if (t.includes('intern')) job_type = 'internship'
  }
  if (!job_type) job_type = detectJobType(title) || 'full-time'

  const parsed = parseSalary(r.text || '', 'USD')

  return {
    title,
    url,
    company: r.company_name || 'Unknown',
    location: r.location || (r.remote ? 'Remote' : null),
    source: 'FindWork',
    posted_at: r.date_posted ? new Date(r.date_posted).toISOString() : null,
    job_type,
    work_arrangement: r.remote ? 'remote' : null,
    salary: null,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
