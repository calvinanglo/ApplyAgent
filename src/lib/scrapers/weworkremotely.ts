/**
 * We Work Remotely scraper — public RSS feeds.
 *
 * https://weworkremotely.com/categories/remote-programming-jobs.rss
 * No auth. One of the largest remote-only job boards.
 * We pull multiple category feeds in parallel and merge.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, cleanText, detectJobType, parseSalary } from './types'

const CATEGORY_FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-design-jobs.rss',
  'https://weworkremotely.com/categories/remote-marketing-jobs.rss',
  'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
  'https://weworkremotely.com/categories/remote-business-exec-management-jobs.rss',
  'https://weworkremotely.com/categories/remote-product-jobs.rss',
  'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  'https://weworkremotely.com/categories/all-other-remote-jobs.rss',
]

export interface WwrSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeWeWorkRemotely(params: WwrSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 1000
  const keywordLower = params.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  const allJobs: ScannedJob[] = []
  const seen = new Set<string>()

  const results = await Promise.allSettled(
    CATEGORY_FEEDS.map(feed => fetchFeed(feed))
  )

  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    for (const job of r.value) {
      if (allJobs.length >= maxResults) break
      if (seen.has(job.url)) continue

      // Keyword filter
      if (keywordLower.length) {
        const haystack = `${job.title} ${job.company}`.toLowerCase()
        const matches = keywordLower.some(w => haystack.includes(w))
        if (!matches) continue
      }

      seen.add(job.url)
      allJobs.push(job)
    }
  }

  return allJobs
}

async function fetchFeed(feedUrl: string): Promise<ScannedJob[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return []

    const xml = await res.text()
    const $ = cheerio.load(xml, { xmlMode: true })

    const jobs: ScannedJob[] = []
    $('item').each((_, el) => {
      const item = $(el)
      const title = cleanText(item.find('title').first().text())
      const link = cleanText(item.find('link').first().text())
      const description = cleanText(item.find('description').first().text())
      const pubDate = cleanText(item.find('pubDate').first().text())
      const region = cleanText(item.find('region').first().text())

      if (!title || !link) return

      // WWR titles are typically "Company: Job Title"
      let company = 'Unknown'
      let jobTitle = title
      const colonIdx = title.indexOf(':')
      if (colonIdx > 0 && colonIdx < 60) {
        company = title.slice(0, colonIdx).trim()
        jobTitle = title.slice(colonIdx + 1).trim()
      }

      const parsed = parseSalary(description || '', 'USD')

      jobs.push({
        title: jobTitle,
        url: link,
        company,
        location: region || 'Remote',
        source: 'We Work Remotely',
        posted_at: pubDate ? new Date(pubDate).toISOString() : null,
        job_type: detectJobType(jobTitle) || 'full-time',
        work_arrangement: 'remote',
        salary: null,
        salary_min: parsed.salary_min,
        salary_max: parsed.salary_max,
        salary_currency: parsed.salary_currency,
      })
    })

    return jobs
  } catch {
    return []
  }
}
