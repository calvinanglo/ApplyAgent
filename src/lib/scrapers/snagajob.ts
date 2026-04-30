/**
 * Snagajob scraper — largest US hourly job board.
 *
 * Strong coverage of retail, food service, hospitality, customer service,
 * warehousing, drivers, healthcare aides, etc. Fills the gap left by
 * tech-focused boards.
 * https://www.snagajob.com/
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.snagajob.com/jobs'
const MAX_PAGES = 5
const DELAY_MS = 600

export interface SnagajobSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeSnagajob(params: SnagajobSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 200
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('q', params.keywords)
      url.searchParams.set('w', params.location)
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

      // Snagajob uses [data-test-id="job-list-item"] pattern
      const cards = $('[data-test-id*="job"], article[class*="job"], li[class*="job-result"]')
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
  const titleEl = card.find('h2 a, h3 a, [data-test-id*="title"] a, a[class*="title"]').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  let jobUrl = titleEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.snagajob.com${jobUrl}`
  if (!jobUrl) return null

  const companyEl = card.find('[data-test-id*="company"], [class*="company"], [class*="employer"]').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  const locEl = card.find('[data-test-id*="location"], [class*="location"]').first()
  const location = cleanText(locEl.text()) || null

  // Snagajob always shows pay rates — usually hourly
  const payEl = card.find('[data-test-id*="pay"], [class*="pay"], [class*="wage"]').first()
  const payText = cleanText(payEl.text()) || null
  const parsed = parseSalary(payText || '', 'USD')

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'Snagajob',
    posted_at: null,
    job_type: detectJobType(title),
    work_arrangement: detectWorkArrangement(title, location),
    salary: payText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
