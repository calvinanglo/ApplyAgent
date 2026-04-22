/**
 * The Muse scraper — public JSON API.
 *
 * https://www.themuse.com/api/public/jobs?page=0
 * No auth required (though API key gives higher rate limit).
 * Optional MUSE_API_KEY env var for 500/hr vs 3600/hr limits.
 * Strong US + CA coverage with company profiles.
 */

import { ScannedJob, getRandomUserAgent, detectJobType, parseSalary } from './types'

const API_URL = 'https://www.themuse.com/api/public/jobs'
const MAX_PAGES = 20

export interface MuseSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface MuseLocation {
  name?: string
}

interface MuseCompany {
  name?: string
  short_name?: string
}

interface MuseLevel {
  name?: string
}

interface MuseCategory {
  name?: string
}

interface MuseJob {
  id?: number
  name?: string
  contents?: string
  type?: string
  publication_date?: string
  short_name?: string
  refs?: { landing_page?: string }
  company?: MuseCompany
  locations?: MuseLocation[]
  categories?: MuseCategory[]
  levels?: MuseLevel[]
}

interface MuseResponse {
  page?: number
  page_count?: number
  results?: MuseJob[]
}

export async function scrapeMuse(params: MuseSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 1000
  const keywordLower = params.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const locationLower = params.location.toLowerCase()
  const apiKey = process.env.MUSE_API_KEY

  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 0; page < MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      const url = new URL(API_URL)
      url.searchParams.set('page', String(page))
      if (apiKey) url.searchParams.set('api_key', apiKey)
      // Muse supports location param — pass city name if given
      if (params.location && params.location.toLowerCase() !== 'remote') {
        url.searchParams.append('location', params.location)
      }

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const data: MuseResponse = await res.json()
      const results = data.results || []
      if (!results.length) break

      let newCount = 0
      for (const r of results) {
        if (jobs.length >= maxResults) break
        const job = mapJob(r)
        if (!job) continue
        if (seen.has(job.url)) continue

        // Keyword filter
        if (keywordLower.length) {
          const haystack = `${job.title} ${job.company} ${r.contents || ''}`.toLowerCase()
          const matches = keywordLower.some(w => haystack.includes(w))
          if (!matches) continue
        }

        // Location filter — permissive: include if location matches OR job is flexible
        if (locationLower && locationLower !== 'remote' && job.location) {
          const jobLoc = job.location.toLowerCase()
          if (!jobLoc.includes(locationLower) && !jobLoc.includes('flexible')) {
            continue
          }
        }

        seen.add(job.url)
        jobs.push(job)
        newCount++
      }

      if (data.page_count && page >= data.page_count - 1) break
      if (newCount === 0) break
    } catch {
      break
    }
  }

  return jobs
}

function mapJob(r: MuseJob): ScannedJob | null {
  const title = r.name
  const url = r.refs?.landing_page
  if (!title || !url) return null

  const company = r.company?.name || 'Unknown'
  const location = (r.locations || []).map(l => l.name).filter(Boolean).join(', ') || null
  const isRemote = location?.toLowerCase().includes('flexible') || location?.toLowerCase().includes('remote')

  let job_type: string | null = null
  if (r.type) {
    const t = r.type.toLowerCase()
    if (t.includes('full')) job_type = 'full-time'
    else if (t.includes('part')) job_type = 'part-time'
    else if (t.includes('contract') || t.includes('freelance')) job_type = 'contract'
    else if (t.includes('intern')) job_type = 'internship'
    else if (t.includes('temporary')) job_type = 'temporary'
  }
  if (!job_type) job_type = detectJobType(title) || 'full-time'

  const parsed = parseSalary(r.contents || '', 'USD')

  return {
    title,
    url,
    company,
    location,
    source: 'The Muse',
    posted_at: r.publication_date ? new Date(r.publication_date).toISOString() : null,
    job_type,
    work_arrangement: isRemote ? 'remote' : null,
    salary: null,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
