/**
 * Jooble scraper — REST API (POST).
 *
 * Aggregates jobs from thousands of boards across 70+ countries.
 * Free API key at https://jooble.org/api/about (500 requests).
 * Requires JOOBLE_API_KEY env var.
 */

import { ScannedJob, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const MAX_PAGES = 20
const RESULT_ON_PAGE = 50
const DELAY_MS = 400

export interface JoobleSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface JoobleJob {
  title?: string
  company?: string
  location?: string
  snippet?: string
  salary?: string
  source?: string
  type?: string
  link?: string
  id?: string
  updated?: string
}

export async function scrapeJooble(params: JoobleSearchParams): Promise<ScannedJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY
  if (!apiKey) return []

  const maxResults = params.maxResults || 1000
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const res = await fetch(`https://jooble.org/api/${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: params.keywords,
          location: params.location,
          ResultOnPage: RESULT_ON_PAGE,
          page,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const data = await res.json()
      const results: JoobleJob[] = data.jobs || []
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

      if (newCount === 0) break
    } catch {
      break
    }
  }

  return jobs
}

function mapJob(r: JoobleJob): ScannedJob | null {
  if (!r.title || !r.link) return null

  const company = r.company || r.source || 'Unknown'

  // Parse type field
  let job_type: string | null = null
  if (r.type) {
    const t = r.type.toLowerCase()
    if (t.includes('full')) job_type = 'full-time'
    else if (t.includes('part')) job_type = 'part-time'
    else if (t.includes('contract')) job_type = 'contract'
    else if (t.includes('temp')) job_type = 'temporary'
    else if (t.includes('intern')) job_type = 'internship'
  }
  if (!job_type) job_type = detectJobType(r.title)

  const salaryText = r.salary || null
  const parsed = parseSalary(salaryText || '')

  return {
    title: r.title,
    url: r.link,
    company,
    location: r.location || null,
    source: 'Jooble',
    posted_at: r.updated ? new Date(r.updated).toISOString() : null,
    job_type,
    work_arrangement: detectWorkArrangement(r.title, r.location || null),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
