/**
 * Indeed Canada scraper — HTTP + cheerio.
 *
 * Hits ca.indeed.com/jobs search pages and parses job cards.
 * No browser, no auth, no API key required.
 * Ported from Python BeautifulSoup scraper.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, delay, cleanText, detectJobType, detectWorkArrangement } from './types'

const BASE_URL = 'https://ca.indeed.com/jobs'
const MAX_PAGES = 3
const PAGE_SIZE = 10
const DELAY_MS = 2000

export interface IndeedSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeIndeed(params: IndeedSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 25
  const jobs: ScannedJob[] = []

  for (let page = 0; page < MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 0) await delay(DELAY_MS)

      const url = new URL(BASE_URL)
      url.searchParams.set('q', params.keywords)
      url.searchParams.set('l', params.location)
      url.searchParams.set('sort', 'date')
      url.searchParams.set('start', String(page * PAGE_SIZE))

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) break

      const html = await res.text()
      const $ = cheerio.load(html)

      // Indeed uses multiple card layouts — try them all
      let cards = $('div.job_seen_beacon')
      if (!cards.length) cards = $('div.jobsearch-ResultsList > div')
      if (!cards.length) cards = $('li div.cardOutline')
      if (!cards.length) cards = $('div.tapItem')

      if (!cards.length) break // HTML structure changed or no results

      cards.each((_, el) => {
        if (jobs.length >= maxResults) return false // stop iterating
        const job = parseIndeedCard($, $(el))
        if (job) jobs.push(job)
      })

      // Check for next page
      const hasNext = $('a[data-testid="pagination-page-next"]').length > 0 ||
        $('nav[aria-label="pagination"] a').toArray().some(a => $(a).attr('aria-label')?.toLowerCase().includes('next'))

      if (!hasNext) break
    } catch {
      break // network error, timeout, etc — return what we have
    }
  }

  return jobs
}

function parseIndeedCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>): ScannedJob | null {
  // ── Title ──────────────────────────────────────────
  const titleEl = card.find('h2.jobTitle a span').first() ||
    card.find('h2.jobTitle span').first() ||
    card.find('a[data-jk] span').first() ||
    card.find('h2 a').first()

  const title = cleanText(titleEl.text())
  if (!title) return null

  // ── URL ────────────────────────────────────────────
  let jobUrl = ''
  const linkEl = card.find('h2.jobTitle a').first()
  const href = linkEl.attr('href') || ''
  if (href) {
    jobUrl = href.startsWith('/') ? `https://ca.indeed.com${href}` : href
  }
  // Fallback: data-jk attribute for direct job ID link
  if (!jobUrl) {
    const jk = card.attr('data-jk') || card.find('[data-jk]').first().attr('data-jk') || ''
    if (jk) jobUrl = `https://ca.indeed.com/viewjob?jk=${jk}`
  }
  if (!jobUrl) return null

  // ── Company ────────────────────────────────────────
  const companyEl = card.find('[data-testid="company-name"]').first() ||
    card.find('span.companyName').first() ||
    card.find('span.company').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  // ── Location ───────────────────────────────────────
  const locEl = card.find('[data-testid="text-location"]').first() ||
    card.find('div.companyLocation').first() ||
    card.find('span.companyLocation').first()
  const location = cleanText(locEl.text()) || null

  // ── Salary ─────────────────────────────────────────
  const salaryEl = card.find('[data-testid="attribute_snippet_testid"]').first() ||
    card.find('div.salary-snippet-container').first() ||
    card.find('span.salary-snippet').first()
  const salaryText = cleanText(salaryEl.text())
  // Only keep if it looks like a real salary
  const salary = salaryText.includes('$') ? salaryText : ''

  // ── Posted date ────────────────────────────────────
  const dateEl = card.find('span.date').first() ||
    card.find('[data-testid="myJobsStateDate"]').first()
  const postedText = cleanText(dateEl.text()).toLowerCase()
  const posted_at = parseRelativeDate(postedText)

  // ── Metadata tags ──────────────────────────────────
  const metaText = card.find('div.metadata div').toArray()
    .map(el => cleanText($(el).text()).toLowerCase())
    .join(' ')

  const jobTypeFromMeta = metaText.includes('full-time') ? 'full-time'
    : metaText.includes('part-time') ? 'part-time'
    : metaText.includes('contract') ? 'contract'
    : metaText.includes('temporary') ? 'temporary'
    : null

  const remoteFromMeta = metaText.includes('remote') ? 'remote'
    : metaText.includes('hybrid') ? 'hybrid'
    : null

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'Indeed',
    posted_at,
    job_type: jobTypeFromMeta || detectJobType(title),
    work_arrangement: remoteFromMeta || detectWorkArrangement(title, location),
  }
}

/**
 * Parse Indeed's relative date strings ("Just posted", "1 day ago", "3 days ago", "30+ days ago")
 * into ISO date strings.
 */
function parseRelativeDate(text: string): string | null {
  if (!text) return null
  const now = new Date()

  if (text.includes('just posted') || text.includes('today')) {
    return now.toISOString()
  }

  const dayMatch = text.match(/(\d+)\s*day/)
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10)
    now.setDate(now.getDate() - days)
    return now.toISOString()
  }

  const hourMatch = text.match(/(\d+)\s*hour/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    now.setHours(now.getHours() - hours)
    return now.toISOString()
  }

  return null // "30+ days ago" or unknown format
}
