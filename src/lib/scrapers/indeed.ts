/**
 * Indeed scraper — via RSS feeds from indeed.com and indeed.ca.
 *
 * Indeed's public RSS is limited but stable. We query both US + CA domains.
 * No auth. Returns ~25 jobs per feed, but we paginate with `start`.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const MAX_PAGES = 10
const PAGE_SIZE = 25
const DELAY_MS = 700

export interface IndeedSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeIndeed(params: IndeedSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 500
  const jobs: ScannedJob[] = []
  const seen = new Set<string>()

  // Decide domain
  const locLower = params.location.toLowerCase()
  const isCanada = /canada|\bca\b|toronto|montreal|vancouver|calgary|ottawa|edmonton|winnipeg|quebec|ontario|alberta|bc|british columbia/i.test(params.location)
  const domains = isCanada ? ['ca.indeed.com', 'indeed.com'] : ['indeed.com', 'ca.indeed.com']

  for (const domain of domains) {
    if (jobs.length >= maxResults) break

    for (let page = 0; page < MAX_PAGES && jobs.length < maxResults; page++) {
      try {
        if (page > 0) await delay(DELAY_MS)

        const url = new URL(`https://${domain}/jobs`)
        url.searchParams.set('q', params.keywords)
        url.searchParams.set('l', params.location)
        url.searchParams.set('sort', 'date')
        url.searchParams.set('start', String(page * PAGE_SIZE))
        url.searchParams.set('format', 'rss')

        const res = await fetch(url.toString(), {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'application/rss+xml, application/xml, text/xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) break

        const xml = await res.text()
        if (!xml.trim() || !xml.includes('<item')) break

        const $ = cheerio.load(xml, { xmlMode: true })
        const items = $('item')
        if (!items.length) break

        let newCount = 0
        items.each((_, el) => {
          if (jobs.length >= maxResults) return false
          const job = parseRssItem($, $(el), locLower)
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
  }

  return jobs
}

function parseRssItem($: cheerio.CheerioAPI, item: cheerio.Cheerio<any>, locHint: string): ScannedJob | null {
  const title = cleanText(item.find('title').first().text())
  const link = cleanText(item.find('link').first().text())
  const description = cleanText(item.find('description').first().text())
  const pubDate = cleanText(item.find('pubDate').first().text())

  if (!title || !link) return null

  // Indeed RSS title format: "Job Title - Company - Location"
  const parts = title.split(' - ').map(s => s.trim()).filter(Boolean)
  let jobTitle = title
  let company = 'Unknown'
  let location: string | null = null

  if (parts.length >= 3) {
    jobTitle = parts[0]
    company = parts[1]
    location = parts.slice(2).join(' - ')
  } else if (parts.length === 2) {
    jobTitle = parts[0]
    company = parts[1]
    location = locHint || null
  }

  const parsed = parseSalary(description || '', locHint.includes('canada') ? 'CAD' : 'USD')

  return {
    title: jobTitle,
    url: link,
    company,
    location,
    source: 'Indeed',
    posted_at: pubDate ? new Date(pubDate).toISOString() : null,
    job_type: detectJobType(jobTitle) || 'full-time',
    work_arrangement: detectWorkArrangement(jobTitle, location),
    salary: null,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
