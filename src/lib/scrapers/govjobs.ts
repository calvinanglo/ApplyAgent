/**
 * GovernmentJobs.com scraper — US state/local/federal job board.
 *
 * Massive catalog: police, firefighters, teachers, social workers, planners,
 * engineers, healthcare, trades, administrative, etc. Anything a city,
 * county, state, or federal agency hires for.
 * https://www.governmentjobs.com/
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.governmentjobs.com/jobs'
const MAX_PAGES = 5
const DELAY_MS = 600

export interface GovJobsSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeGovJobs(params: GovJobsSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 200
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('keywords', params.keywords)
      url.searchParams.set('location', params.location)
      if (page > 1) url.searchParams.set('page', String(page))

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const html = await res.text()
      const $ = cheerio.load(html)

      const cards = $('article[class*="job"], div[class*="job-listing"], .job-table tr')
      if (!cards.length) break

      let newCount = 0
      cards.each((_, el) => {
        if (jobs.length >= maxResults) return false
        const job = parseCard($, $(el))
        if (job && !seen.has(job.url)) {
          seen.add(job.url)
          jobs.push(job)
          newCount++
        }
      })

      if (newCount === 0) break
    } catch {
      break
    }
  }

  return jobs
}

function parseCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>): ScannedJob | null {
  const titleEl = card.find('h2 a, h3 a, .job-title a, a[class*="title"]').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  let jobUrl = titleEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.governmentjobs.com${jobUrl}`
  if (!jobUrl) return null

  // Employer is usually the agency / city / county
  const companyEl = card.find('.agency, .employer, [class*="agency"]').first()
  const company = cleanText(companyEl.text()) || 'Government Agency'

  const locEl = card.find('.location, [class*="location"]').first()
  const location = cleanText(locEl.text()) || null

  const salaryEl = card.find('.salary, [class*="salary"], [class*="pay"]').first()
  const salaryText = cleanText(salaryEl.text()) || null
  const parsed = parseSalary(salaryText || '', 'USD')

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'GovernmentJobs',
    posted_at: null,
    job_type: detectJobType(title) || 'full-time',
    work_arrangement: detectWorkArrangement(title, location),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
