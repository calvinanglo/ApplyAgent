/**
 * Talent.com scraper — direct HTML scraping, no API key.
 *
 * Scrapes talent.com public search pages with Cheerio.
 * Major job aggregator covering US, Canada, and 75+ countries.
 * No auth, no API key, no rate limit issues.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.talent.com/jobs'
const MAX_PAGES = 20
const DELAY_MS = 600

export interface TalentSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeTalent(params: TalentSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 500
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('k', params.keywords)
      url.searchParams.set('l', params.location)
      if (page > 1) url.searchParams.set('p', String(page))

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://www.talent.com/',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) break

      const html = await res.text()
      const $ = cheerio.load(html)

      const cards = $('[data-job-id]')
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
  // Title — talent.com uses h2 with class containing "title"
  const titleEl = card.find('h2[class*="title"], h2, h3').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  // URL — talent.com uses /view?id=xxx links
  const linkEl = card.find('a[href*="/view"]').first()
  let jobUrl = linkEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.talent.com${jobUrl}`
  if (!jobUrl) return null

  // Company — in address element with class "meta", or class containing "company"
  const companyEl = card.find('address, [class*="company"], [class*="Company"]').first()
  // address contains "Company • Location", split on bullet
  const metaText = cleanText(companyEl.text())
  const metaParts = metaText.split('•').map(s => s.trim())
  const company = metaParts[0] || 'Unknown'

  // Location — second part of meta, or dedicated location element
  const locEl = card.find('[class*="location"], [class*="Location"]').first()
  const location = cleanText(locEl.text()) || metaParts[1] || null

  // Date — in footer
  const dateEl = card.find('footer, [class*="date"], [class*="Date"], time').first()
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
    source: 'Talent.com',
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
