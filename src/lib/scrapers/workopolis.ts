/**
 * Workopolis scraper — Canadian universal job aggregator.
 *
 * Covers all industries — healthcare, trades, retail, hospitality, finance,
 * tech, etc. HTML scraping, no auth required.
 * https://www.workopolis.com/
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.workopolis.com/jobsearch/find-jobs'
const MAX_PAGES = 10
const DELAY_MS = 500

export interface WorkopolisSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeWorkopolis(params: WorkopolisSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 300
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('ak', params.keywords)
      url.searchParams.set('l', params.location)
      url.searchParams.set('job', 'all')
      if (page > 1) url.searchParams.set('page', String(page))

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

      const cards = $('article[data-job-id], div[class*="job-summary"], .JobInfo')
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
  const titleEl = card.find('h2 a, h3 a, .JobInfoTitle a, a[class*="title"]').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  let jobUrl = titleEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.workopolis.com${jobUrl}`
  if (!jobUrl) return null

  const companyEl = card.find('[class*="company"], .JobInfoCompany').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  const locEl = card.find('[class*="location"], .JobInfoLocation').first()
  const location = cleanText(locEl.text()) || null

  const salaryEl = card.find('[class*="salary"]').first()
  const salaryText = cleanText(salaryEl.text()) || null
  const parsed = parseSalary(salaryText || '', 'CAD')

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'Workopolis',
    posted_at: null,
    job_type: detectJobType(title),
    work_arrangement: detectWorkArrangement(title, location),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency || 'CAD',
  }
}
