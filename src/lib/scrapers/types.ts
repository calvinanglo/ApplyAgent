/**
 * Shared types and utilities for all job scrapers (ATS + board).
 */

// Normalized job shape from any source
export interface ScannedJob {
  title: string
  url: string
  company: string
  location: string | null
  source: string
  posted_at: string | null
  job_type: string | null
  work_arrangement: string | null
  salary: string | null // raw salary text (e.g. "$80,000 - $120,000/yr", "€50K–€70K")
  salary_min: number | null // parsed minimum annual salary in original currency
  salary_max: number | null // parsed maximum annual salary in original currency
  salary_currency: string | null // ISO currency code (CAD, USD, EUR, GBP, etc.)
}

// ── Title filtering ──────────────────────────────────────────

export function titleMatches(title: string, targetRoles: string[]): boolean {
  if (targetRoles.length === 0) return true
  const t = title.toLowerCase()
  return targetRoles.some(role => {
    const words = role.toLowerCase().split(/\s+/)
    return words.some(word => word.length > 2 && t.includes(word))
  })
}

// ── Detection helpers ────────────────────────────────────────

export function detectWorkArrangement(title: string, location: string | null): string | null {
  const text = `${title} ${location || ''}`.toLowerCase()
  if (/\bremote\b|\bwork from home\b|\bwfh\b|\banywhere\b/.test(text)) return 'remote'
  if (/\bhybrid\b/.test(text)) return 'hybrid'
  if (/\bon-?site\b|\bin-?office\b/.test(text)) return 'on-site'
  return null
}

export function detectJobType(title: string): string | null {
  const t = title.toLowerCase()
  if (/\bfull[- ]?time\b/.test(t)) return 'full-time'
  if (/\bpart[- ]?time\b/.test(t)) return 'part-time'
  if (/\bcontract(or)?\b/.test(t)) return 'contract'
  if (/\btemporary\b|\btemp\b/.test(t)) return 'temporary'
  if (/\bpermanent\b/.test(t)) return 'permanent'
  if (/\bfixed[- ]?term\b/.test(t)) return 'fixed-term'
  return null
}

// ── Filter functions ─────────────────────────────────────────

export function filterByDate(jobs: ScannedJob[], datePosted: string): ScannedJob[] {
  const cutoffs: Record<string, number> = { '24h': 1, '3d': 3, '7d': 7, '14d': 14 }
  const days = cutoffs[datePosted]
  if (!days) return jobs
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return jobs.filter(job => {
    if (!job.posted_at) return true
    return new Date(job.posted_at) >= cutoff
  })
}

export function filterByJobType(jobs: ScannedJob[], jobTypes: string[]): ScannedJob[] {
  if (!jobTypes.length) return jobs
  const types = new Set(jobTypes.map(t => t.toLowerCase()))
  return jobs.filter(job => {
    if (!job.job_type) return true
    return types.has(job.job_type)
  })
}

export function filterByWorkArrangement(jobs: ScannedJob[], arrangements: string[]): ScannedJob[] {
  if (!arrangements.length) return jobs
  const arr = new Set(arrangements.map(a => a.toLowerCase()))
  return jobs.filter(job => {
    if (!job.work_arrangement) return true
    return arr.has(job.work_arrangement)
  })
}

// Approximate exchange rates to USD for salary comparison
const TO_USD: Record<string, number> = {
  // Americas
  USD: 1, CAD: 0.73, MXN: 0.058, BRL: 0.19, ARS: 0.0011, COP: 0.00024, CLP: 0.0011, PEN: 0.27,
  // Europe
  EUR: 1.09, GBP: 1.27, CHF: 1.13, SEK: 0.096, NOK: 0.093, DKK: 0.146, PLN: 0.25, CZK: 0.044, RON: 0.22,
  // Asia Pacific
  AUD: 0.65, NZD: 0.60, JPY: 0.0067, KRW: 0.00074, TWD: 0.031, SGD: 0.75, HKD: 0.13, CNY: 0.14,
  INR: 0.012, THB: 0.029, IDR: 0.000063, MYR: 0.22, PHP: 0.018, VND: 0.00004,
  // Middle East & Africa
  AED: 0.27, ILS: 0.28, SAR: 0.27, QAR: 0.27, ZAR: 0.055, NGN: 0.00063, KES: 0.0077, EGP: 0.020,
}

export function filterBySalary(jobs: ScannedJob[], minSalary: number, currency: string = 'CAD'): ScannedJob[] {
  if (!minSalary) return jobs
  const filterRate = TO_USD[currency] || 1
  const filterUsd = minSalary * filterRate

  return jobs.filter(job => {
    // Use parsed salary data if available
    if (job.salary_max != null) {
      const jobRate = TO_USD[job.salary_currency || 'CAD'] || 1
      const jobUsd = job.salary_max * jobRate
      return jobUsd >= filterUsd
    }
    if (job.salary_min != null) {
      const jobRate = TO_USD[job.salary_currency || 'CAD'] || 1
      const jobUsd = job.salary_min * jobRate
      return jobUsd >= filterUsd
    }
    // Fallback: try to parse from salary text or title
    const text = `${job.salary || ''} ${job.title} ${job.location || ''}`
    const nums = text.match(/[\$€£]\s*([\d,]+)/g)
    if (!nums) return true // no salary info, include
    const amounts = nums.map(n => parseInt(n.replace(/[^0-9]/g, ''), 10)).filter(a => a > 1000)
    if (!amounts.length) return true
    return Math.max(...amounts) >= minSalary
  })
}

export function filterByLocation(jobs: ScannedJob[], location: string): ScannedJob[] {
  if (!location) return jobs
  // Split by comma to preserve multi-word terms, then trim each
  const terms = location.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 1)
  return jobs.filter(job => {
    if (!job.location) return false
    const loc = job.location.toLowerCase()
    // Use word boundary matching to prevent partial matches (e.g. "mb" matching "Mumbai")
    return terms.some(term => {
      const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return pattern.test(loc)
    })
  })
}

// ── Salary parsing ──────────────────────────────────────────

const CURRENCY_MAP: Record<string, string> = {
  // Americas
  '$': 'CAD', 'CA$': 'CAD', 'C$': 'CAD', 'CAD': 'CAD',
  'US$': 'USD', 'USD': 'USD',
  'MX$': 'MXN', 'MXN': 'MXN',
  'R$': 'BRL', 'BRL': 'BRL',
  'ARS': 'ARS', 'COP': 'COP', 'CLP': 'CLP',
  'S/': 'PEN', 'PEN': 'PEN',
  // Europe
  '€': 'EUR', 'EUR': 'EUR',
  '£': 'GBP', 'GBP': 'GBP',
  'CHF': 'CHF', 'Fr': 'CHF',
  'kr': 'SEK', 'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK',
  'zł': 'PLN', 'PLN': 'PLN',
  'Kč': 'CZK', 'CZK': 'CZK',
  'lei': 'RON', 'RON': 'RON',
  // Asia Pacific
  'A$': 'AUD', 'AU$': 'AUD', 'AUD': 'AUD',
  'NZ$': 'NZD', 'NZD': 'NZD',
  '¥': 'JPY', 'JPY': 'JPY', 'CNY': 'CNY',
  '₩': 'KRW', 'KRW': 'KRW',
  'NT$': 'TWD', 'TWD': 'TWD',
  'S$': 'SGD', 'SGD': 'SGD',
  'HK$': 'HKD', 'HKD': 'HKD',
  '₹': 'INR', 'INR': 'INR',
  '฿': 'THB', 'THB': 'THB',
  'Rp': 'IDR', 'IDR': 'IDR',
  'RM': 'MYR', 'MYR': 'MYR',
  '₱': 'PHP', 'PHP': 'PHP',
  '₫': 'VND', 'VND': 'VND',
  // Middle East & Africa
  'AED': 'AED', 'د.إ': 'AED',
  '₪': 'ILS', 'ILS': 'ILS',
  '﷼': 'SAR', 'SAR': 'SAR', 'QAR': 'QAR',
  'R': 'ZAR', 'ZAR': 'ZAR',
  '₦': 'NGN', 'NGN': 'NGN',
  'KSh': 'KES', 'KES': 'KES',
  'EGP': 'EGP',
}

/**
 * Parse salary text into structured data.
 * Handles: "$80,000 - $120,000/yr", "CA$60K-80K", "€50,000", "80000", "$25/hr" etc.
 * Defaults to CAD for Canadian job boards.
 */
export function parseSalary(text: string, defaultCurrency: string = 'CAD'): {
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
} {
  if (!text) return { salary_min: null, salary_max: null, salary_currency: defaultCurrency }

  // Detect currency
  let currency = defaultCurrency
  for (const [symbol, code] of Object.entries(CURRENCY_MAP)) {
    if (text.includes(symbol)) { currency = code; break }
  }

  // Extract numbers
  const cleaned = text.replace(/[,$€£₹]/g, '').replace(/\s+/g, ' ')
  const numbers: number[] = []
  const numMatches = cleaned.matchAll(/([\d.]+)\s*[kK]?/g)
  for (const m of numMatches) {
    let val = parseFloat(m[1])
    if (m[0].toLowerCase().includes('k')) val *= 1000
    if (val > 0) numbers.push(val)
  }

  if (!numbers.length) return { salary_min: null, salary_max: null, salary_currency: currency }

  // Detect hourly and annualize (assuming 40h/week, 52 weeks)
  const isHourly = /\b(hr|hour|hourly|\/h)\b/i.test(text)
  const factor = isHourly ? 2080 : 1

  // Filter out unreasonably small/large numbers
  const annualized = numbers.map(n => n * factor).filter(n => n >= 10000 && n <= 1000000)
  if (!annualized.length) return { salary_min: null, salary_max: null, salary_currency: currency }

  return {
    salary_min: Math.min(...annualized),
    salary_max: Math.max(...annualized),
    salary_currency: currency,
  }
}

// ── HTTP utilities ───────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
]

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export function delay(ms: number): Promise<void> {
  const jitter = ms * (0.7 + Math.random() * 0.6) // ±30% jitter
  return new Promise(resolve => setTimeout(resolve, jitter))
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
