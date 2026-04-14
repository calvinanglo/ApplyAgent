// JD URL fetchers shared between single-item and batch processing routes.

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '')
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') || hostname.startsWith('172.17.') || hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') || hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') || hostname.startsWith('172.23.') || hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') || hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') || hostname.startsWith('172.29.') || hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('fc') || hostname.startsWith('fd') ||
      hostname.startsWith('fe80') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localhost') ||
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'metadata.google.com' ||
      /^0x[0-9a-f]/i.test(hostname) ||
      /^\d+$/.test(hostname)
    ) return false
    if (!hostname.includes('.')) return false
    return true
  } catch {
    return false
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr|section|article)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

interface JdResult { text: string; location: string | null }

/** Detect JS-rendered garbage that slipped through HTML stripping */
function isGarbageContent(text: string): boolean {
  if (text.length < 200) return true
  // Count words (3+ letter sequences) vs total characters
  const words = text.match(/[a-zA-Z]{3,}/g) || []
  if (words.length < 30) return true
  // JS template / framework artifacts
  const jsPatterns = /function\s*\(|===|data-bind|ko\.|knockout|\$\.t\(|angular\.|ng-|v-if=|v-for=|React\.|useState|handleClick/gi
  const jsMatches = text.match(jsPatterns) || []
  if (jsMatches.length > 5) return true
  // High ratio of special chars to alpha chars = code not prose
  const alphaChars = (text.match(/[a-zA-Z]/g) || []).length
  const specialChars = (text.match(/[{}()=;:><|&$]/g) || []).length
  if (specialChars > 0 && alphaChars / specialChars < 3) return true
  return false
}

async function fetchGreenhouseJd(url: string): Promise<JdResult | null> {
  const boardMatch = url.match(/(?:boards|job-boards)\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
  const ghJidMatch = !boardMatch ? url.match(/[?&]gh_jid=(\d+)/) : null
  if (!boardMatch && !ghJidMatch) return null

  try {
    let apiUrl: string
    if (boardMatch) {
      const [, company, jobId] = boardMatch
      apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`
    } else {
      const jobId = ghJidMatch![1]
      const hostname = new URL(url).hostname.replace('www.', '')
      const company = hostname.split('.')[0]
      apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`
    }

    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as { content?: string; title?: string; location?: { name?: string } }
    if (!data.content) return null
    const title = data.title || ''
    const location = data.location?.name || ''
    const content = stripHtml(data.content)
    return { text: `${title}\n${location}\n\n${content}`.trim(), location: location || null }
  } catch {
    return null
  }
}

async function fetchLeverJd(url: string): Promise<JdResult | null> {
  const match = url.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/)
  if (!match) return null
  const [, company, jobId] = match
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${company}/${jobId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      text?: string
      descriptionPlain?: string
      categories?: { location?: string; commitment?: string; team?: string }
      lists?: Array<{ text: string; content: string }>
    }
    const location = data.categories?.location || null
    const parts: string[] = []
    if (data.text) parts.push(data.text)
    if (location) parts.push(`Location: ${location}`)
    if (data.categories?.commitment) parts.push(`Type: ${data.categories.commitment}`)
    if (data.categories?.team) parts.push(`Team: ${data.categories.team}`)
    if (data.descriptionPlain) parts.push(data.descriptionPlain)
    if (data.lists) {
      for (const list of data.lists) {
        parts.push(`\n${list.text}\n${stripHtml(list.content)}`)
      }
    }
    const result = parts.join('\n').trim()
    return result ? { text: result, location } : null
  } catch {
    return null
  }
}

async function fetchAshbyJd(url: string): Promise<JdResult | null> {
  const match = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([a-f0-9-]+)/)
  if (!match) return null
  const [, company, jobId] = match
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company}/posting/${jobId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      info?: { title?: string; location?: string; descriptionHtml?: string; descriptionPlain?: string }
    }
    const info = data.info
    if (!info) return null
    const location = info.location || null
    const parts: string[] = []
    if (info.title) parts.push(info.title)
    if (location) parts.push(`Location: ${location}`)
    if (info.descriptionPlain) parts.push(info.descriptionPlain)
    else if (info.descriptionHtml) parts.push(stripHtml(info.descriptionHtml))
    const result = parts.join('\n').trim()
    return result ? { text: result, location } : null
  } catch {
    return null
  }
}

async function fetchWorkdayJd(url: string): Promise<JdResult | null> {
  const match = url.match(/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:([^/]+))?(.+)/)
  if (!match) return null
  const [, subdomain, wd, siteId, path] = match
  try {
    const apiUrl = `https://${subdomain}.${wd}.myworkdayjobs.com/wday/cxs/${subdomain}/${siteId || ''}${path}`
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      jobPostingInfo?: { title?: string; location?: string; jobDescription?: string }
    }
    const info = data.jobPostingInfo
    if (!info?.jobDescription) return null
    const location = info.location || null
    const parts: string[] = []
    if (info.title) parts.push(info.title)
    if (location) parts.push(`Location: ${location}`)
    parts.push(stripHtml(info.jobDescription))
    return { text: parts.join('\n').trim(), location }
  } catch {
    return null
  }
}

async function fetchSmartRecruitersJd(url: string): Promise<JdResult | null> {
  const match = url.match(/jobs\.smartrecruiters\.com\/([^/]+)\/([^/?#]+)/)
  if (!match) return null
  const [, company, postingId] = match
  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${company}/postings/${postingId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      name?: string; location?: { city?: string; region?: string; country?: string }
      jobAd?: { sections?: Record<string, { text?: string }> }
      department?: { label?: string }; experienceLevel?: { label?: string }
    }
    const parts: string[] = []
    if (data.name) parts.push(data.name)
    const loc = data.location
    const locStr = [loc?.city, loc?.region, loc?.country].filter(Boolean).join(', ')
    if (locStr) parts.push(`Location: ${locStr}`)
    if (data.department?.label) parts.push(`Department: ${data.department.label}`)
    if (data.experienceLevel?.label) parts.push(`Level: ${data.experienceLevel.label}`)
    if (data.jobAd?.sections) {
      for (const section of Object.values(data.jobAd.sections)) {
        if (section.text) parts.push(stripHtml(section.text))
      }
    }
    const result = parts.join('\n').trim()
    return result.length > 100 ? { text: result, location: locStr || null } : null
  } catch {
    return null
  }
}

async function fetchIcimsJd(url: string): Promise<JdResult | null> {
  // iCIMS URLs: careers-*.icims.com/jobs/12345/... or *.icims.com/jobs/12345/...
  const match = url.match(/([^/]+)\.icims\.com\/jobs\/(\d+)/)
  if (!match) return null
  const [, subdomain, jobId] = match
  try {
    const res = await fetch(`https://${subdomain}.icims.com/jobs/${jobId}/job`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const text = stripHtml(html)
    return text.length > 200 && !isGarbageContent(text) ? { text: text.slice(0, 12000), location: null } : null
  } catch {
    return null
  }
}

async function fetchBreezyJd(url: string): Promise<JdResult | null> {
  const match = url.match(/([^.]+)\.breezy\.hr\/p\/([a-f0-9]+)/)
  if (!match) return null
  const [, company, posId] = match
  try {
    const res = await fetch(`https://${company}.breezy.hr/json?verbose=true`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const jobs = await res.json() as Array<{ id?: string; name?: string; description?: string; location?: { name?: string } }>
    const job = jobs.find(j => j.id && posId.startsWith(j.id))
    if (!job?.description) return null
    const location = job.location?.name || null
    const parts: string[] = []
    if (job.name) parts.push(job.name)
    if (location) parts.push(`Location: ${location}`)
    parts.push(stripHtml(job.description))
    return { text: parts.join('\n').trim(), location }
  } catch {
    return null
  }
}

async function fetchPinpointJd(url: string): Promise<JdResult | null> {
  const match = url.match(/([^.]+)\.pinpointhq\.com\/(?:jobs|postings)\/(\d+)/)
  if (!match) return null
  const [, company, jobId] = match
  try {
    const res = await fetch(`https://${company}.pinpointhq.com/postings.json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as { data?: Array<{ title?: string; description?: string; link?: string; location?: string; department?: string }> }
    const job = (data.data || []).find(j => j.link?.includes(jobId))
    if (!job?.description) return null
    const parts: string[] = []
    if (job.title) parts.push(job.title)
    if (job.location) parts.push(`Location: ${job.location}`)
    if (job.department) parts.push(`Department: ${job.department}`)
    parts.push(stripHtml(job.description))
    return { text: parts.join('\n').trim(), location: job.location || null }
  } catch {
    return null
  }
}

async function fetchRecruiteeJd(url: string): Promise<JdResult | null> {
  const match = url.match(/([^.]+)\.recruitee\.com\/o\/([^/?#]+)/)
  if (!match) return null
  const [, company, slug] = match
  try {
    const res = await fetch(`https://${company}.recruitee.com/api/offers`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as { offers?: Array<{ title?: string; description?: string; requirements?: string; location?: string; slug?: string; department?: string }> }
    const job = (data.offers || []).find(o => o.slug === slug)
    if (!job) return null
    const parts: string[] = []
    if (job.title) parts.push(job.title)
    if (job.location) parts.push(`Location: ${job.location}`)
    if (job.department) parts.push(`Department: ${job.department}`)
    if (job.description) parts.push(stripHtml(job.description))
    if (job.requirements) parts.push(stripHtml(job.requirements))
    const result = parts.join('\n').trim()
    return result.length > 100 ? { text: result, location: job.location || null } : null
  } catch {
    return null
  }
}

async function fetchEightfoldJd(url: string): Promise<JdResult | null> {
  const match = url.match(/([^.]+)\.eightfold\.ai\/.*?(?:position|job).*?(\d{5,})/)
  if (!match) return null
  const [, company, jobId] = match
  try {
    const res = await fetch(`https://${company}.eightfold.ai/api/apply/v2/jobs/${jobId}?domain=${company}.com&hl=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as { name?: string; location?: string; department?: string; job_description?: string }
    if (!data.job_description) return null
    const parts: string[] = []
    if (data.name) parts.push(data.name)
    if (data.location) parts.push(`Location: ${data.location}`)
    if (data.department) parts.push(`Department: ${data.department}`)
    parts.push(stripHtml(data.job_description))
    return { text: parts.join('\n').trim(), location: data.location || null }
  } catch {
    return null
  }
}

async function fetchPersonioJd(url: string): Promise<JdResult | null> {
  const match = url.match(/([^.]+)\.jobs\.personio\.(com|de)\/job\/(\d+)/)
  if (!match) return null
  const [, company, tld, jobId] = match
  try {
    const res = await fetch(`https://${company}.jobs.personio.${tld}/xml?language=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const xml = await res.text()
    // Parse XML for the matching position
    const posRegex = new RegExp(`<id>${jobId}</id>[\\s\\S]*?<name>([\\s\\S]*?)</name>[\\s\\S]*?(?:<office>([\\s\\S]*?)</office>)?[\\s\\S]*?<jobDescriptions>([\\s\\S]*?)</jobDescriptions>`, 'i')
    const posMatch = xml.match(posRegex)
    if (!posMatch) return null
    const [, title, office, descriptions] = posMatch
    const parts: string[] = []
    if (title) parts.push(title.trim())
    if (office) parts.push(`Location: ${office.trim()}`)
    // Extract all <value> tags from jobDescriptions
    const valueMatches = descriptions.matchAll(/<value>([\s\S]*?)<\/value>/gi)
    for (const m of valueMatches) {
      parts.push(stripHtml(m[1]))
    }
    const result = parts.join('\n').trim()
    return result.length > 100 ? { text: result, location: office?.trim() || null } : null
  } catch {
    return null
  }
}

async function fetchTeamtailorJd(url: string): Promise<JdResult | null> {
  // Teamtailor uses custom domains, detect via /jobs/ path or .teamtailor.com
  const ttMatch = url.match(/([^.]+)\.teamtailor\.com\/jobs\/(\d+)/)
  if (!ttMatch) return null
  const [, company, jobId] = ttMatch
  try {
    const res = await fetch(`https://${company}.teamtailor.com/jobs.rss`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const xml = await res.text()
    // Find matching item by job ID in link
    const itemRegex = new RegExp(`<item>[\\s\\S]*?<link>[^<]*${jobId}[^<]*</link>[\\s\\S]*?<title>([^<]*)</title>[\\s\\S]*?<description>([\\s\\S]*?)</description>[\\s\\S]*?</item>`, 'i')
    const itemMatch = xml.match(itemRegex)
    if (!itemMatch) return null
    const [, title, description] = itemMatch
    const parts: string[] = []
    if (title) parts.push(title.trim())
    parts.push(stripHtml(description))
    const result = parts.join('\n').trim()
    return result.length > 100 ? { text: result, location: null } : null
  } catch {
    return null
  }
}

async function fetchGenericJd(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  return stripHtml(html)
}

export async function fetchJdFromUrl(url: string): Promise<JdResult> {
  if (!isAllowedUrl(url)) {
    throw new Error('URL not allowed: internal or private addresses are blocked')
  }

  // Try ATS-specific API fetchers first (fast + reliable)
  const atsFetchers = [
    fetchGreenhouseJd, fetchLeverJd, fetchAshbyJd, fetchWorkdayJd,
    fetchSmartRecruitersJd, fetchIcimsJd, fetchBreezyJd, fetchPinpointJd,
    fetchRecruiteeJd, fetchEightfoldJd, fetchPersonioJd, fetchTeamtailorJd,
  ]
  for (const fetcher of atsFetchers) {
    const result = await fetcher(url)
    if (result && result.text.length > 100) return { text: result.text.slice(0, 12000), location: result.location }
  }

  // Fall back to generic HTML scraping
  try {
    const text = await fetchGenericJd(url)
    if (isGarbageContent(text)) {
      throw new Error(
        `This career page uses JavaScript rendering and can't be scanned automatically. ` +
        `Copy the job description text and paste it directly instead.`
      )
    }
    return { text: text.slice(0, 12000), location: null }
  } catch (err) {
    if (err instanceof Error && err.message.includes("can't be scanned")) throw err
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
