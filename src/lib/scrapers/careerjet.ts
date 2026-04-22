/**
 * CareerJet scraper — direct HTML scraping, no API key.
 *
 * Scrapes careerjet.ca public search pages with Cheerio.
 * Global job aggregator covering 90+ countries.
 * No auth, no API key required.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.careerjet.ca/search/jobs'
const MAX_PAGES = 20
const DELAY_MS = 600

export interface CareerJetSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeCareerJet(params: CareerJetSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 500
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('s', params.keywords)
      url.searchParams.set('l', params.location)
      if (page > 1) url.searchParams.set('p', String(page))

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://www.careerjet.ca/',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const html = await res.text()
      const $ = cheerio.load(html)

      const cards = $('article[class*="job"]')
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
  // Title — in h2 > a or header > a
  const titleEl = card.find('h2 a, header a, [class*="title"] a').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  // URL
  let jobUrl = titleEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.careerjet.ca${jobUrl}`
  if (!jobUrl) return null

  // Company
  const companyEl = card.find('[class*="company"], p.company').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  // Location
  const locEl = card.find('[class*="location"], [class*="locale"], ul.location li').first()
  const location = cleanText(locEl.text()) || null

  // Date
  const dateEl = card.find('[class*="date"], time').first()
  const dateText = cleanText(dateEl.text())
  const posted_at = parseRelativeDate(dateText)

  // Salary
  const salaryEl = card.find('[class*="salary"], [class*="Salary"]').first()
  const salaryText = cleanText(salaryEl.text()) || null
  const parsed = parseSalary(salaryText || '')

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'CareerJet',
    posted_at,
    job_type: detectJobType(title),
    work_arrangement: detectWorkArrangement(title, location),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}

function parseRelativeDate(text: string): string | null {
  if (!text) return null
  const lower = text.toLowerCase()
  const now = new Date()

  const match = lower.match(/(\d+)\s*(hour|day|week|month)/)
  if (match) {
    const n = parseInt(match[1], 10)
    const unit = match[2]
    if (unit === 'hour') now.setHours(now.getHours() - n)
    else if (unit === 'day') now.setDate(now.getDate() - n)
    else if (unit === 'week') now.setDate(now.getDate() - n * 7)
    else if (unit === 'month') now.setMonth(now.getMonth() - n)
    return now.toISOString()
  }

  if (lower.includes('today') || lower.includes('just now')) return now.toISOString()
  if (lower.includes('yesterday')) { now.setDate(now.getDate() - 1); return now.toISOString() }

  return null
}
