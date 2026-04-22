/**
 * LinkedIn scraper — public guest API + cheerio.
 *
 * Hits LinkedIn's guest job search API which returns HTML fragments
 * without requiring authentication. No browser needed.
 * Ported from Python scraper.
 */

import * as cheerio from 'cheerio'
import { ScannedJob, getRandomUserAgent, delay, cleanText, detectJobType, detectWorkArrangement, parseSalary } from './types'

const API_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const MAX_PAGES = 40 // 40 × 25 = 1000 jobs max per search
const PAGE_SIZE = 25
const DELAY_MS = 800

export interface LinkedInSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

export async function scrapeLinkedIn(params: LinkedInSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 1000
  const jobs: ScannedJob[] = []

  for (let page = 0; page < MAX_PAGES && jobs.length < maxResults; page++) {
    try {
      if (page > 0) await delay(DELAY_MS)

      const url = new URL(API_URL)
      url.searchParams.set('keywords', params.keywords)
      url.searchParams.set('location', params.location)
      url.searchParams.set('start', String(page * PAGE_SIZE))
      url.searchParams.set('f_TPR', 'r604800') // past week
      url.searchParams.set('position', '1')
      url.searchParams.set('pageNum', '0')

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.linkedin.com/jobs/search/',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) break

      const html = await res.text()
      if (!html.trim()) break

      const $ = cheerio.load(html)

      // LinkedIn guest API returns list items with base-card class
      const cards = $('li')
      if (!cards.length) break

      cards.each((_, el) => {
        if (jobs.length >= maxResults) return false
        const job = parseLinkedInCard($, $(el))
        if (job) jobs.push(job)
      })

      // If we got fewer than PAGE_SIZE, there's no next page
      if (cards.length < PAGE_SIZE) break
    } catch {
      break
    }
  }

  return jobs
}

function parseLinkedInCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>): ScannedJob | null {
  // ── Title ──────────────────────────────────────────
  const titleEl = card.find('h3.base-search-card__title').first() ||
    card.find('h3.base-card__title').first()
  const title = cleanText(titleEl.text())
  if (!title) return null

  // ── Company ────────────────────────────────────────
  const companyEl = card.find('h4.base-search-card__subtitle').first() ||
    card.find('a.hidden-nested-link').first()
  const company = cleanText(companyEl.text()) || 'Unknown'

  // ── Location ───────────────────────────────────────
  const locEl = card.find('span.job-search-card__location').first()
  const location = cleanText(locEl.text()) || null

  // ── URL ────────────────────────────────────────────
  const linkEl = card.find('a.base-card__full-link').first() ||
    card.find('a[href*="/jobs/view/"]').first()
  let jobUrl = linkEl.attr('href') || ''
  // Clean tracking params but keep the job ID path
  if (jobUrl) {
    try {
      const u = new URL(jobUrl)
      // Keep only the path (strips tracking query params)
      jobUrl = `https://www.linkedin.com${u.pathname}`
    } catch {
      if (jobUrl.startsWith('/')) jobUrl = `https://www.linkedin.com${jobUrl}`
    }
  }
  if (!jobUrl) return null

  // ── Posted date ────────────────────────────────────
  const timeEl = card.find('time').first()
  const datetime = timeEl.attr('datetime') || ''
  const posted_at = datetime || null

  // ── Salary ─────────────────────────────────────────
  const salaryEl = card.find('span.job-search-card__salary-info').first()
  const salaryText = cleanText(salaryEl.text()) || null
  const parsed = parseSalary(salaryText || '')

  // ── Remote badge ───────────────────────────────────
  const benefitsEl = card.find('span.result-benefits__text').first()
  const benefitsText = cleanText(benefitsEl.text()).toLowerCase()
  const remoteFromBadge = benefitsText.includes('remote') ? 'remote'
    : benefitsText.includes('hybrid') ? 'hybrid'
    : null

  return {
    title,
    url: jobUrl,
    company,
    location,
    source: 'LinkedIn',
    posted_at,
    job_type: detectJobType(title),
    work_arrangement: remoteFromBadge || detectWorkArrangement(title, location),
    salary: salaryText,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
