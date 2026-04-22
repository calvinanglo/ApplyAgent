/**
 * Hacker News "Who is Hiring" scraper — via Algolia search API.
 *
 * https://hn.algolia.com/api/v1/search?query={kw}&tags=comment,story_{thread_id}
 * Public API from YC. No auth. Includes high-quality startup jobs.
 *
 * We search recent Who is Hiring threads and filter comments by keyword.
 */

import { ScannedJob, detectJobType, detectWorkArrangement, parseSalary, delay } from './types'

const ALGOLIA_URL = 'https://hn.algolia.com/api/v1/search'
const DELAY_MS = 300

export interface HNHiringSearchParams {
  keywords: string
  location: string
  maxResults?: number
}

interface AlgoliaStory {
  objectID?: string
  title?: string
  created_at_i?: number
}

interface AlgoliaComment {
  objectID?: string
  story_id?: number
  author?: string
  comment_text?: string
  created_at?: string
  created_at_i?: number
  parent_id?: number
  story_title?: string
}

interface AlgoliaResponse<T> {
  hits?: T[]
  nbHits?: number
}

export async function scrapeHNHiring(params: HNHiringSearchParams): Promise<ScannedJob[]> {
  const maxResults = params.maxResults || 500

  try {
    // Step 1: find recent "Ask HN: Who is hiring?" story threads
    const storiesRes = await fetch(
      `${ALGOLIA_URL}?query=${encodeURIComponent('Ask HN Who is hiring')}&tags=story,author_whoishiring&hitsPerPage=6`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!storiesRes.ok) return []
    const storiesData: AlgoliaResponse<AlgoliaStory> = await storiesRes.json()
    const threads = (storiesData.hits || []).filter(s => /who is hiring/i.test(s.title || '')).slice(0, 3)
    if (!threads.length) return []

    const jobs: ScannedJob[] = []
    const seen = new Set<string>()
    const locationLower = params.location.toLowerCase()
    const keywordLower = params.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 2)

    // Step 2: pull comments from each thread
    for (const thread of threads) {
      if (jobs.length >= maxResults) break
      if (!thread.objectID) continue

      await delay(DELAY_MS)

      const q = keywordLower.join(' ')
      const url = new URL(ALGOLIA_URL)
      if (q) url.searchParams.set('query', q)
      url.searchParams.set('tags', `comment,story_${thread.objectID}`)
      url.searchParams.set('hitsPerPage', '500')

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) })
      if (!res.ok) continue

      const data: AlgoliaResponse<AlgoliaComment> = await res.json()
      const hits = data.hits || []

      for (const hit of hits) {
        if (jobs.length >= maxResults) break
        const job = parseComment(hit, locationLower)
        if (!job) continue
        if (seen.has(job.url)) continue
        seen.add(job.url)
        jobs.push(job)
      }
    }

    return jobs
  } catch {
    return []
  }
}

function parseComment(hit: AlgoliaComment, locationLower: string): ScannedJob | null {
  const text = hit.comment_text
  if (!text) return null

  // HN comments are HTML-ish. Decode + strip.
  const decoded = text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (decoded.length < 40) return null

  // Typical format: "Company | Job Title | Location | Remote/Onsite | Full-Time"
  const firstLine = decoded.split(/[\|•]/)
  if (firstLine.length < 2) return null

  const company = firstLine[0].trim().slice(0, 80)
  if (!company || company.length < 2) return null

  // Look for job title — often the 2nd segment
  let title = firstLine[1]?.trim().slice(0, 120) || ''
  if (!title) {
    // Fallback: try to match common job title patterns
    const titleMatch = decoded.match(/(Senior|Junior|Staff|Principal|Lead|Software|Engineer|Developer|Designer|Manager|Analyst|Scientist|Data|Product|DevOps|SRE|QA)[A-Za-z\s]*/i)
    if (titleMatch) title = titleMatch[0].trim().slice(0, 120)
  }
  if (!title) return null

  // Detect location
  const remainder = firstLine.slice(2).join(' | ')
  const isRemote = /remote|anywhere|worldwide/i.test(decoded)
  const locationText = firstLine[2]?.trim() || (isRemote ? 'Remote' : null)

  // Filter by location match if specified (permissive — include remote always)
  if (locationLower && locationLower !== 'remote' && !isRemote && locationText) {
    if (!locationText.toLowerCase().includes(locationLower)) {
      // Check remainder too
      if (!remainder.toLowerCase().includes(locationLower)) return null
    }
  }

  const parsed = parseSalary(decoded, 'USD')

  // Build URL pointing to the HN comment
  const url = `https://news.ycombinator.com/item?id=${hit.objectID}`

  return {
    title,
    url,
    company,
    location: locationText,
    source: 'HN Who is Hiring',
    posted_at: hit.created_at || (hit.created_at_i ? new Date(hit.created_at_i * 1000).toISOString() : null),
    job_type: detectJobType(title) || 'full-time',
    work_arrangement: isRemote ? 'remote' : detectWorkArrangement(title, locationText),
    salary: null,
    salary_min: parsed.salary_min,
    salary_max: parsed.salary_max,
    salary_currency: parsed.salary_currency,
  }
}
