/**
 * Adzuna scraper — REST API covering US, CA, UK, and 16 countries.
 *
 * https://developer.adzuna.com/
 * Free tier: 1000 calls/month with excellent job data quality.
 * Requires ADZUNA_APP_ID and ADZUNA_APP_KEY env vars.
 *
 * We query both US and CA to maximize North American coverage.
 */

import { ScannedJob, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const MAX_PAGES = 20
const RESULTS_PER_PAGE = 50
const DELAY_MS = 300

export interface AdzunaSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface AdzunaJob {
  id?: string
  title?: string
  description?: string
  redirect_url?: string
  company?: { display_name?: string }
  location?: { display_name?: string; area?: string[] }
  salary_min?: number
  salary_max?: number
  salary_is_predicted?: string
  contract_time?: string
  contract_type?: string
  category?: { label?: string }
  created?: string
  latitude?: number
  longitude?: number
}

interface AdzunaResponse {
  results?: AdzunaJob[]
  count?: number
}

export async function scrapeAdzuna(params: AdzunaSearchParams): Promise<ScannedJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  const maxResults = params.maxResults || 1000
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  // Determine country based on location text
  const locLower = params.location.toLowerCase()
  const isCanada = /canada|\bca\b|toronto|montreal|vancouver|calgary|ottawa|edmonton|winnipeg|quebec|ontario|alberta|bc|british columbia/i.test(params.location)
  const isUK = /united kingdom|\buk\b|london|manchester|birmingham|glasgow|edinburgh/i.test(locLower)
  const countries = isUK ? ['gb'] : isCanada ? ['ca', 'us'] : ['us', 'ca']

  for (const country of countries) {
    if (jobs.length >= maxResults) break

    for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
      try {
        if (page > 1) await delay(DELAY_MS)

        const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`)
        url.searchParams.set('app_id', appId)
        url.searchParams.set('app_key', appKey)
        url.searchParams.set('results_per_page', String(RESULTS_PER_PAGE))
        url.searchParams.set('what', params.keywords)
        if (params.location) url.searchParams.set('where', params.location)
        url.searchParams.set('sort_by', 'date')
        url.searchParams.set('content-type', 'application/json')

        const res = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) break

        const data: AdzunaResponse = await res.json()
        const results = data.results || []
        if (!results.length) break

        let newCount = 0
        for (const r of results) {
          if (jobs.length >= maxResults) break
          const job = mapJob(r, country)
          if (job && !seen.has(job.url)) {
            seen.add(job.url)
            jobs.push(job)
            newCount++
          }
        }

        if (newCount === 0) break
      } catch {
        break
      }
    }
  }

  return jobs
}

function mapJob(r: AdzunaJob, country: string): ScannedJob | null {
  if (!r.title || !r.redirect_url) return null

  const salaryText = r.salary_min && r.salary_max ? `$${Math.round(r.salary_min / 1000)}K–$${Math.round(r.salary_max / 1000)}K` : null
  const currency = country === 'ca' ? 'CAD' : country === 'gb' ? 'GBP' : 'USD'
  const parsed = parseSalary(salaryText || '', currency)

  // Normalize contract_time
  let job_type: string | null = null
  if (r.contract_time) {
    const t = r.contract_time.toLowerCase()
    if (t.includes('full')) job_type = 'full-time'
    else if (t.includes('part')) job_type = 'part-time'
  }
  if (!job_type && r.contract_type) {
    const t = r.contract_type.toLowerCase()
    if (t.includes('contract')) job_type = 'contract'
    else if (t.includes('permanent')) job_type = 'permanent'
  }
  if (!job_type) job_type = detectJobType(r.title) || 'full-time'

  const location = r.location?.display_name || null

  return {
    title: r.title,
    url: r.redirect_url,
    company: r.company?.display_name || 'Unknown',
    location,
    source: 'Adzuna',
    posted_at: r.created || null,
    job_type,
    work_arrangement: detectWorkArrangement(r.title, location),
    salary: salaryText,
    salary_min: parsed.salary_min ?? r.salary_min ?? null,
    salary_max: parsed.salary_max ?? r.salary_max ?? null,
    salary_currency: parsed.salary_currency || currency,
  }
}
