/**
 * Job Bank Canada scraper — public RSS feed from the Government of Canada.
 *
 * https://www.jobbank.gc.ca/jobsearch/jobsearch?fsrc=32&searchstring={kw}&locationstring={loc}&sort=M&page=1
 * Provides RSS export via &rss=1 parameter. Official Canadian federal job board.
 * No auth required.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const BASE_URL = 'https://www.jobbank.gc.ca/jobsearch/jobsearch'
const MAX_PAGES = 20
const DELAY_MS = 500

export interface JobBankSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeJobBank(params: JobBankSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 1000
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 1) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('searchstring', params.keywords)
      url.searchParams.set('locationstring', params.location)
      url.searchParams.set('sort', 'M')
      url.searchParams.set('page', String(page))
      url.searchParams.set('fsrc', '32')

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

      const cards = $('article[id^="article-"]')
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
  const linkEl = card.find('a.resultJobItem, a[href*="/jobpost/"]').first()
  let jobUrl = linkEl.attr('href') || ''
  if (jobUrl.startsWith('/')) jobUrl = `https://www.jobbank.gc.ca${jobUrl}`
  if (!jobUrl) return null

  const title = cleanText(card.find('h3, .noctitle').first().text())
  if (!title) return null

  const company = cleanText(card.find('.business, li.business').first().text()) || 'Unknown'
  const location = cleanText(card.find('.location, li.location').first().text()) || null
  const salaryText = cleanText(card.find('.salary, li.salary').first().text()) || null
  const parsed = parseSalary(salaryText || '', 'CAD')

  const dateText = cleanText(card.find('.date, li.date').first().text())
  const posted_at = parseJobBankDate(dateText)

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'Job Bank Canada',
    posted_at,
    job_type: detectJobType(title),
    work_arrangement: detectWorkArrangement(title, location),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency || 'CAD',
  }
}

function parseJobBankDate(text: string): string | null {
  if (!text) return null
  // Format: "Date posted September 29, 2025" or relative
  const match = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (match) {
    try {
      return new Date(`${match[1]} ${match[2]}, ${match[3]}`).toISOString()
    } catch { return null }
  }
  return null
}
