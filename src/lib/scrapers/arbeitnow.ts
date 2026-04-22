/**
 * Arbeitnow scraper — public JSON API.
 *
 * https://www.arbeitnow.com/api/job-board-api
 * No auth. Open source. Returns remote-first jobs worldwide.
 * Paginated, returns ~100 jobs per page.
 */

import { ScannedJob, getRandomUserAgent, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const API_URL = 'https://www.arbeitnow.com/api/job-board-api'
const MAX_PAGES = 10
const DELAY_MS = 400

export interface ArbeitnowSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface ArbeitnowJob {
  slug?: string
  company_name?: string
  title?: string
  description?: string
  remote?: boolean
  url?: string
  tags?: string[]
  job_types?: string[]
  location?: string
  created_at?: number
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[]
  links?: { next?: string }
}

export async function scrapeArbeitnow(params: ArbeitnowSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 500
  const keywordLower = params.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  let nextUrl: string | null = API_URL

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults && nextUrl; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const res = await fetch(nextUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const data: ArbeitnowResponse = await res.json()
      const results = data.data || []
      if (!results.length) break

      let newCount = 0
      for (const r of results) {
        if (jobs.length >= maxResults) break
        const job = mapJob(r)
        if (!job) continue
        if (seen.has(job.url)) continue

        // Keyword filter (API returns all jobs, no search param)
        if (keywordLower.length) {
          const haystack = `${job.title} ${job.company} ${(r.tags || []).join(' ')}`.toLowerCase()
          const matches = keywordLower.some(w => haystack.includes(w))
          if (!matches) continue
        }

        seen.add(job.url)
        jobs.push(job)
        newCount++
      }

      nextUrl = data.links?.next || null
      if (newCount === 0) break
    } catch {
      break
    }
  }

  return jobs
}

function mapJob(r: ArbeitnowJob): ScannedJob | null {
  const title = r.title
  const url = r.url || (r.slug ? `https://www.arbeitnow.com/view/${r.slug}` : '')
  if (!title || !url) return null

  let job_type: string | null = null
  const jt = (r.job_types || []).join(' ').toLowerCase()
  if (jt.includes('full')) job_type = 'full-time'
  else if (jt.includes('part')) job_type = 'part-time'
  else if (jt.includes('contract') || jt.includes('freelance')) job_type = 'contract'
  else if (jt.includes('intern')) job_type = 'internship'
  if (!job_type) job_type = detectJobType(title) || 'full-time'

  return {
    title,
    url,
    company: r.company_name || 'Unknown',
    location: r.location || (r.remote ? 'Remote' : null),
    source: 'Arbeitnow',
    posted_at: r.created_at ? new Date(r.created_at * 1000).toISOString() : null,
    job_type,
    work_arrangement: r.remote ? 'remote' : detectWorkArrangement(title, r.location || null),
    salary: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
  }
}
