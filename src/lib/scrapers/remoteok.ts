/**
 * Remote OK scraper — public JSON API.
 *
 * Returns up to ~1000 remote jobs from https://remoteok.com/api
 * No auth, no API key. Pure JSON. Remote-only board.
 */

import { ScannedJob, getRandomUserAgent, detectJobType, parseSalary } from './types'

const API_URL = 'https://remoteok.com/api'

export interface RemoteOkSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface RemoteOkJob {
  id?: string | number
  slug?: string
  epoch?: number
  date?: string
  company?: string
  company_logo?: string
  position?: string
  tags?: string[]
  description?: string
  location?: string
  salary?: string
  salary_min?: number
  salary_max?: number
  apply_url?: string
  url?: string
}

export async function scrapeRemoteOk(params: RemoteOkSearchParams): Promise<ScannedJob[]> {
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

    const data: RemoteOkJob[] = await res.json()
    // First entry is metadata, skip
    const rawJobs = Array.isArray(data) ? data.slice(1) : []

    const jobs: ScannedJob[] = []
    for (const r of rawJobs) {
      if (jobs.length >= maxResults) break
      const job = mapJob(r)
      if (!job) continue

      // Keyword filter on title/tags/description since API has no search param
      if (keywordLower.length) {
        const haystack = `${job.title} ${(r.tags || []).join(' ')} ${r.description || ''}`.toLowerCase()
        const matches = keywordLower.some(w => haystack.includes(w))
        if (!matches) continue
      }

      jobs.push(job)
    }

    return jobs
  } catch {
    return []
  }
}

function mapJob(r: RemoteOkJob): ScannedJob | null {
  const title = r.position
  if (!title) return null

  const url = r.url || (r.slug ? `https://remoteok.com/remote-jobs/${r.slug}` : '')
  if (!url) return null

  const salaryText = r.salary || (r.salary_min && r.salary_max ? `$${r.salary_min}-$${r.salary_max}` : null)
  const parsed = parseSalary(salaryText || '', 'USD')

  return {
    title,
    url,
    company: r.company || 'Unknown',
    location: r.location || 'Remote',
    source: 'Remote OK',
    posted_at: r.date ? new Date(r.date).toISOString() : r.epoch ? new Date(r.epoch * 1000).toISOString() : null,
    job_type: detectJobType(title) || 'full-time',
    work_arrangement: 'remote',
    salary: salaryText,
    salary_min: parsed.salary_min ?? (r.salary_min || null),
    salary_max: parsed.salary_max ?? (r.salary_max || null),
    salary_currency: parsed.salary_currency || 'USD',
  }
}
