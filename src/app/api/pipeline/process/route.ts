import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildEvaluationSystemPrompt } from '@/lib/prompts/evaluation-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 300 // 5 minutes — evaluation + URL fetch + DB can take time

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '') // strip trailing dot
    // Block all private/reserved IPs and hostnames
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
      hostname.startsWith('169.254.') || // Link-local
      hostname.startsWith('fc') || hostname.startsWith('fd') || // IPv6 ULA
      hostname.startsWith('fe80') || // IPv6 link-local
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localhost') ||
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'metadata.google.com' ||
      /^0x[0-9a-f]/i.test(hostname) || // Hex IP encoding
      /^\d+$/.test(hostname) // Decimal IP encoding
    ) return false
    // Must have a valid TLD
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

// ATS-specific fetchers that use native APIs for clean JD text
interface JdResult { text: string; location: string | null }

async function fetchGreenhouseJd(url: string): Promise<JdResult | null> {
  // Standard Greenhouse board URLs
  const boardMatch = url.match(/(?:boards|job-boards)\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
  // Custom domain with gh_jid query param (e.g. fastly.com/about/jobs/apply?gh_jid=123)
  const ghJidMatch = !boardMatch ? url.match(/[?&]gh_jid=(\d+)/) : null

  if (!boardMatch && !ghJidMatch) return null

  try {
    let apiUrl: string
    if (boardMatch) {
      const [, company, jobId] = boardMatch
      apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`
    } else {
      // For gh_jid URLs, we need to find the company board name.
      // Try fetching the HTML page to extract the board name, or use the job ID directly
      const jobId = ghJidMatch![1]
      // Try to extract company from the hostname (e.g. fastly.com -> fastly)
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

async function fetchJdFromUrl(url: string): Promise<JdResult> {
  if (!isAllowedUrl(url)) {
    throw new Error('URL not allowed: internal or private addresses are blocked')
  }

  // Try ATS-specific APIs first — they return clean, structured JD text
  const atsFetchers = [fetchGreenhouseJd, fetchLeverJd, fetchAshbyJd, fetchWorkdayJd]
  for (const fetcher of atsFetchers) {
    const result = await fetcher(url)
    if (result && result.text.length > 100) return { text: result.text.slice(0, 12000), location: result.location }
  }

  // Fallback to generic HTML fetch
  try {
    const text = await fetchGenericJd(url)
    return { text: text.slice(0, 12000), location: null }
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = rateLimit(`process:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { pipeline_item_id: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Get pipeline item
    const { data: item } = await db
      .from('pipeline_items')
      .select('*')
      .eq('id', body.pipeline_item_id)
      .eq('user_id', user.id)
      .single()
    if (!item) return Response.json({ error: 'Pipeline item not found' }, { status: 404 })

    // Mark as processing
    await db.from('pipeline_items').update({ status: 'processing' }).eq('id', item.id)

    const ai = getAIClient()
    const { data: cvDoc } = await db
      .from('cv_documents')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (!cvDoc) {
      await db.from('pipeline_items').update({ status: 'error', error_message: 'No CV found' }).eq('id', item.id)
      return Response.json({ error: 'No CV found' }, { status: 400 })
    }

    // Fetch JD BEFORE deducting credits — no charge if fetch fails
    let jdText = ''
    let jdLocation: string | null = item.location || null
    try {
      const jdResult = await fetchJdFromUrl(item.url)
      jdText = jdResult.text
      if (jdResult.location) jdLocation = jdResult.location
    } catch (fetchErr) {
      await db.from('pipeline_items').update({
        status: 'error',
        error_message: fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch URL',
      }).eq('id', item.id)
      return Response.json({ error: 'Failed to fetch job description' }, { status: 422 })
    }

    // Validate JD text is substantial enough to evaluate — no charge if too short
    if (!jdText || jdText.trim().length < 150) {
      await db.from('pipeline_items').update({
        status: 'error',
        error_message: 'Job description too short or could not be extracted from page',
      }).eq('id', item.id)
      return Response.json({ error: 'Job description could not be extracted' }, { status: 422 })
    }

    // Deduct credits only after JD is validated
    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.batch_per_offer,
      p_action: 'evaluation',
    }) as any
    if (!creditResult?.success) {
      await db.from('pipeline_items').update({ status: 'error', error_message: 'Insufficient credits' }).eq('id', item.id)
      return Response.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    const archetype = detectArchetype(jdText)
    const systemPrompt = buildEvaluationSystemPrompt(cvDoc.content, archetype.name)

    const response = await ai.messages.create({
      model: MODELS.evaluation,
      max_tokens: 8000,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Evaluate this job description:\n\n${jdText}`,
      }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let evaluation: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      await db.from('pipeline_items').update({ status: 'error', error_message: 'Failed to parse evaluation' }).eq('id', item.id)
      return Response.json({ error: 'Failed to parse evaluation' }, { status: 500 })
    }

    const company = (evaluation.company as string) || item.company || 'Unknown'
    const role = (evaluation.role as string) || item.title || 'Unknown'

    // Save report
    const { data: report } = await db.from('reports').insert({
      user_id: user.id,
      company,
      role,
      archetype: evaluation.archetype || archetype.name,
      score: evaluation.score || 0,
      jd_text: jdText,
      jd_url: item.url,
      block_a: evaluation.block_a,
      block_b: evaluation.block_b,
      block_c: evaluation.block_c,
      block_d: evaluation.block_d,
      block_e: evaluation.block_e,
      block_f: evaluation.block_f,
      block_g: evaluation.block_g || null,
      keywords: evaluation.keywords || [],
    }).select('id').single()

    // Create application
    if (report) {
      const { count } = await db.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      await db.from('applications').insert({
        user_id: user.id,
        sequence_number: (count || 0) + 1,
        company,
        role,
        score: evaluation.score || 0,
        status: 'Evaluated',
        report_id: report.id,
        location: jdLocation,
      })
    }

    // Mark pipeline item as done — clear any previous error message
    await db.from('pipeline_items').update({
      status: 'done',
      company,
      title: role,
      location: jdLocation,
      report_id: report?.id || null,
      score: evaluation.score || 0,
      error_message: null,
      processed_at: new Date().toISOString(),
    }).eq('id', item.id)

    return Response.json({
      success: true,
      company,
      role,
      score: evaluation.score || 0,
      report_id: report?.id,
    })
  } catch (err) {
    // Ensure pipeline item is marked as error so it doesn't stay stuck at 'processing'
    try {
      const supabase = await createClient()
      const db = supabase as any
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const body = await request.clone().json().catch(() => null)
        if (body?.pipeline_item_id) {
          await db.from('pipeline_items').update({
            status: 'error',
            error_message: err instanceof Error ? err.message : 'Server error',
          }).eq('id', body.pipeline_item_id).eq('user_id', user.id)
        }
      }
    } catch { /* best effort */ }
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
