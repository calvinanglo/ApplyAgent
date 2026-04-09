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

export function filterBySalary(jobs: ScannedJob[], minSalary: number): ScannedJob[] {
  if (!minSalary) return jobs
  return jobs.filter(job => {
    // No salary info → include (don't exclude unknowns)
    const title = `${job.title} ${job.location || ''}`.toLowerCase()
    // Extract salary numbers from title/location if present
    const nums = title.match(/\$\s*([\d,]+)/g)
    if (!nums) return true // no salary info, include
    const amounts = nums.map(n => parseInt(n.replace(/[$,\s]/g, ''), 10)).filter(a => a > 1000) // filter out hourly
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
