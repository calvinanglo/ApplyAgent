/**
 * Eluta scraper — Canadian generalist job aggregator.
 *
 * Covers all industries — government, healthcare, trades, retail, finance,
 * tech, etc. Indexes Canada's Top 100 Employers and many SMBs.
 * https://www.eluta.ca/
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.eluta.ca/search'
const MAX_PAGES = 10
const DELAY_MS = 500

export interface ElutaSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeEluta(params: ElutaSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 200
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('q', params.keywords)
      url.searchParams.set('l', params.location)
      if (page > 1) url.searchParams.set('p', String(page))

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const html = await res.text()
      const $ = cheerio.load(html)

      // Eluta uses .lr-job-result and similar wrappers
      const cards = $('.lr-job-result, .organic, article[class*="job"]')
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
  const titleEl = card.find('h3 a, h2 a, .lr-title a, a[class*="title"]').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  let jobUrl = titleEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.eluta.ca${jobUrl}`
  if (!jobUrl) return null

  const companyEl = card.find('.lr-employer, [class*="employer"], [class*="company"]').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  const locEl = card.find('.lr-location, [class*="location"]').first()
  const location = cleanText(locEl.text()) || null

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'Eluta',
    posted_at: null,
    job_type: detectJobType(title),
    work_arrangement: detectWorkArrangement(title, location),
    salary: null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'CAD',
  }
}
