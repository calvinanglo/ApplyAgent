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

const UNSUPPORTED_ATS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /taleo\.net/i, name: 'Taleo' },
  { pattern: /icims\.com/i, name: 'iCIMS' },
  { pattern: /\/psp\/|\/psc\/|peoplesoft/i, name: 'PeopleSoft' },
  { pattern: /smartrecruiters\.com/i, name: 'SmartRecruiters' },
  { pattern: /successfactors\./i, name: 'SAP SuccessFactors' },
  { pattern: /ultipro\.com/i, name: 'UKG/UltiPro' },
  { pattern: /ukg\.net|ultiproworkplace/i, name: 'UKG' },
]

function checkUnsupportedAts(url: string): string | null {
  for (const { pattern, name } of UNSUPPORTED_ATS) {
    if (pattern.test(url)) return name
  }
  return null
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

  const unsupported = checkUnsupportedAts(url)
  if (unsupported) {
    throw new Error(
      `${unsupported} career pages can't be scanned automatically. ` +
      `Copy the job description text and paste it in the Evaluate tab instead.`
    )
  }

  const atsFetchers = [fetchGreenhouseJd, fetchLeverJd, fetchAshbyJd, fetchWorkdayJd]
  for (const fetcher of atsFetchers) {
    const result = await fetcher(url)
    if (result && result.text.length > 100) return { text: result.text.slice(0, 12000), location: result.location }
  }

  try {
    const text = await fetchGenericJd(url)
    return { text: text.slice(0, 12000), location: null }
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
