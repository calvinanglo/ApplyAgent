/**
 * USAJobs scraper — official US federal government job board API.
 *
 * https://developer.usajobs.gov/
 * Requires USAJOBS_API_KEY (free, email to get a key) and USAJOBS_EMAIL as User-Agent.
 * Returns up to ~1000 results per search across 800K+ federal jobs.
 */

import { ScannedJob, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const API_URL = 'https://data.usajobs.gov/api/search'
const MAX_PAGES = 20
const RESULTS_PER_PAGE = 50
const DELAY_MS = 300

export interface USAJobsSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface USAJobsResult {
  MatchedObjectDescriptor?: {
    PositionTitle?: string
    PositionURI?: string
    ApplyURI?: string[]
    OrganizationName?: string
    DepartmentName?: string
    PositionLocation?: Array<{ LocationName?: string; CountryCode?: string }>
    PositionLocationDisplay?: string
    PublicationStartDate?: string
    PositionStartDate?: string
    PositionEndDate?: string
    PositionSchedule?: Array<{ Name?: string }>
    PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string; Description?: string }>
    PositionOfferingType?: Array<{ Name?: string }>
    UserArea?: { Details?: { TeleworkEligible?: boolean; RemoteIndicator?: boolean } }
  }
}

interface USAJobsResponse {
  SearchResult?: {
    SearchResultCount?: number
    SearchResultCountAll?: number
    SearchResultItems?: USAJobsResult[]
  }
}

export async function scrapeUSAJobs(params: USAJobsSearchParams): Promise<ScannedJob[]> {
  const apiKey = process.env.USAJOBS_API_KEY
  const email = process.env.USAJOBS_EMAIL
  if (!apiKey || !email) return []

  const maxResults = params.maxResults || 1000
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(API_URL)
      url.searchParams.set('Keyword', params.keywords)
      // USAJobs expects LocationName as "City, State" format
      if (params.location && !/remote/i.test(params.location)) {
        url.searchParams.set('LocationName', params.location)
      }
      url.searchParams.set('ResultsPerPage', String(RESULTS_PER_PAGE))
      url.searchParams.set('Page', String(page))
      url.searchParams.set('SortField', 'OpenDate')
      url.searchParams.set('SortDirection', 'Desc')

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization-Key': apiKey,
          'User-Agent': email,
          'Host': 'data.usajobs.gov',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const data: USAJobsResponse = await res.json()
      const items = data.SearchResult?.SearchResultItems || []
      if (!items.length) break

      let newCount = 0
      for (const item of items) {
        if (jobs.length >= maxResults) break
        const job = mapJob(item)
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

  return jobs
}

function mapJob(item: USAJobsResult): ScannedJob | null {
  const d = item.MatchedObjectDescriptor
  if (!d) return null

  const title = d.PositionTitle
  const url = d.PositionURI
  if (!title || !url) return null

  const location = d.PositionLocationDisplay ||
    (d.PositionLocation || []).map(l => l.LocationName).filter(Boolean).join('; ') || null

  const remuneration = d.PositionRemuneration?.[0]
  const salaryMin = remuneration?.MinimumRange ? parseFloat(remuneration.MinimumRange) : null
  const salaryMax = remuneration?.MaximumRange ? parseFloat(remuneration.MaximumRange) : null
  const isHourly = remuneration?.RateIntervalCode === 'Per Hour'
  const factor = isHourly ? 2080 : 1
  const salaryText = remuneration ? `$${Math.round((salaryMin || 0) / 1000)}K–$${Math.round((salaryMax || 0) / 1000)}K${isHourly ? '/hr' : ''}` : null

  // Determine job type from PositionSchedule
  let job_type: string | null = null
  const schedule = (d.PositionSchedule || [])[0]?.Name?.toLowerCase() || ''
  if (schedule.includes('full')) job_type = 'full-time'
  else if (schedule.includes('part')) job_type = 'part-time'
  else if (schedule.includes('intermittent') || schedule.includes('temporary')) job_type = 'temporary'
  if (!job_type) job_type = detectJobType(title) || 'full-time'

  // Determine remote status
  const telework = d.UserArea?.Details?.TeleworkEligible
  const remote = d.UserArea?.Details?.RemoteIndicator
  const work_arrangement = remote ? 'remote' : telework ? 'hybrid' : detectWorkArrangement(title, location)

  const parsed = parseSalary(salaryText || '', 'USD')

  return {
    title,
    url,
    company: d.OrganizationName || d.DepartmentName || 'US Federal Government',
    location,
    source: 'USAJobs',
    posted_at: d.PublicationStartDate || d.PositionStartDate || null,
    job_type,
    work_arrangement,
    salary: salaryText,
    salary_min: parsed.salary_min ?? (salaryMin ? salaryMin * factor : null),
    salary_max: parsed.salary_max ?? (salaryMax ? salaryMax * factor : null),
    salary_currency: 'USD',
  }
}
