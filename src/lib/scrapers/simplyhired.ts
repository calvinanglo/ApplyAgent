/**
 * SimplyHired scraper — public RSS feed.
 *
 * One of the largest US generalist job boards — covers every industry from
 * retail to healthcare to skilled trades. Free RSS feed, no auth required.
 * https://www.simplyhired.com/
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.simplyhired.com/search'
const MAX_PAGES = 5
const DELAY_MS = 600

export interface SimplyHiredSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeSimplyHired(params: SimplyHiredSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 200
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('q', params.keywords)
      url.searchParams.set('l', params.location)
      if (page > 1) url.searchParams.set('pn', String(page))

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

      // SimplyHired uses data-id attributes on job cards
      const cards = $('article[data-id], li[data-id], [data-testid="searchSerpJob"]')
      if (!cards.length) break

      let newCount = 0
      cards.each((_, el) => {
        if (jobs.length >= maxResults) return false
        const job = parseCard($, $(el), params.location)
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

function parseCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>, locHint: string): ScannedJob | null {
  // Title — usually inside an <h3> or h2
  const titleEl = card.find('h3 a, h2 a, [data-testid*="title"] a, a[data-testid*="title"]').first()
  const title = cleanText(titleEl.text() || card.find('h3, h2').first().text())
  if (!title) return null

  // URL
  let jobUrl = titleEl.attr('href') || card.find('a[href*="/job/"]').first().attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.simplyhired.com${jobUrl}`
  if (!jobUrl) return null

  // Company
  const companyEl = card.find('[data-testid*="company"], .companyName, span[class*="company"]').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  // Location
  const locEl = card.find('[data-testid*="location"], .location, span[class*="location"]').first()
  const location = cleanText(locEl.text()) || null

  // Salary (when listed)
  const salaryEl = card.find('[data-testid*="salary"], [class*="salary"]').first()
  const salaryText = cleanText(salaryEl.text()) || null
  const isCanada = /canada|ontario|alberta|quebec|toronto|vancouver|calgary|montreal|ottawa|winnipeg/i.test(locHint + ' ' + (location || ''))
  const parsed = parseSalary(salaryText || '', isCanada ? 'CAD' : 'USD')

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'SimplyHired',
    posted_at: null,
    job_type: detectJobType(title),
    work_arrangement: detectWorkArrangement(title, location),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
