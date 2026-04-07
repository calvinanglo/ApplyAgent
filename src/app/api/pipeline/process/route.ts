import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildEvaluationSystemPrompt } from '@/lib/prompts/evaluation-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 300 // 5 minutes — evaluation + URL fetch + DB can take time

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Block internal/private IPs and non-http protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname === '169.254.169.254' || // Cloud metadata
      hostname === 'metadata.google.internal'
    ) return false
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

async function fetchGreenhouseJd(url: string): Promise<string | null> {
  // Pattern: boards.greenhouse.io/{company}/jobs/{id} or job-boards.greenhouse.io/...
  const match = url.match(/(?:boards|job-boards)\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
  if (!match) return null
  const [, company, jobId] = match
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAgent/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as { content?: string; title?: string; location?: { name?: string } }
    if (!data.content) return null
    const title = data.title || ''
    const location = data.location?.name || ''
    const content = stripHtml(data.content)
    return `${title}\n${location}\n\n${content}`.trim()
  } catch {
    return null
  }
}

async function fetchLeverJd(url: string): Promise<string | null> {
  // Pattern: jobs.lever.co/{company}/{uuid}
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
    const parts: string[] = []
    if (data.text) parts.push(data.text)
    if (data.categories?.location) parts.push(`Location: ${data.categories.location}`)
    if (data.categories?.commitment) parts.push(`Type: ${data.categories.commitment}`)
    if (data.categories?.team) parts.push(`Team: ${data.categories.team}`)
    if (data.descriptionPlain) parts.push(data.descriptionPlain)
    if (data.lists) {
      for (const list of data.lists) {
        parts.push(`\n${list.text}\n${stripHtml(list.content)}`)
      }
    }
    const result = parts.join('\n').trim()
    return result || null
  } catch {
    return null
  }
}

async function fetchAshbyJd(url: string): Promise<string | null> {
  // Pattern: jobs.ashbyhq.com/{company}/{uuid}
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
    const parts: string[] = []
    if (info.title) parts.push(info.title)
    if (info.location) parts.push(`Location: ${info.location}`)
    if (info.descriptionPlain) parts.push(info.descriptionPlain)
    else if (info.descriptionHtml) parts.push(stripHtml(info.descriptionHtml))
    const result = parts.join('\n').trim()
    return result || null
  } catch {
    return null
  }
}

async function fetchWorkdayJd(url: string): Promise<string | null> {
  // Pattern: {company}.wd{n}.myworkdayjobs.com/{siteId}/job/{path}
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
    const parts: string[] = []
    if (info.title) parts.push(info.title)
    if (info.location) parts.push(`Location: ${info.location}`)
    parts.push(stripHtml(info.jobDescription))
    return parts.join('\n').trim()
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

async function fetchJdFromUrl(url: string): Promise<string> {
  if (!isAllowedUrl(url)) {
    throw new Error('URL not allowed: internal or private addresses are blocked')
  }

  // Try ATS-specific APIs first — they return clean, structured JD text
  const atsFetchers = [fetchGreenhouseJd, fetchLeverJd, fetchAshbyJd, fetchWorkdayJd]
  for (const fetcher of atsFetchers) {
    const result = await fetcher(url)
    if (result && result.length > 100) return result.slice(0, 12000)
  }

  // Fallback to generic HTML fetch
  try {
    const text = await fetchGenericJd(url)
    return text.slice(0, 12000)
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

    const anthropic = getAnthropicClient()
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

    // Deduct credits
    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.batch_per_offer,
      p_action: 'evaluation',
    }) as any
    if (!creditResult?.success) {
      await db.from('pipeline_items').update({ status: 'error', error_message: 'Insufficient credits' }).eq('id', item.id)
      return Response.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    // Fetch JD
    let jdText = ''
    try {
      jdText = await fetchJdFromUrl(item.url)
    } catch (fetchErr) {
      await db.from('pipeline_items').update({
        status: 'error',
        error_message: fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch URL',
      }).eq('id', item.id)
      return Response.json({ error: 'Failed to fetch job description' }, { status: 422 })
    }

    // Validate JD text is substantial enough to evaluate
    if (!jdText || jdText.trim().length < 150) {
      await db.from('pipeline_items').update({
        status: 'error',
        error_message: 'Job description too short or could not be extracted from page',
      }).eq('id', item.id)
      // Refund credits since we couldn't evaluate
      const { data: bal } = await db.from('credit_balances').select('balance').eq('user_id', user.id).single()
      const newBalance = (bal?.balance || 0) + CREDIT_COSTS.batch_per_offer
      await db.from('credit_balances').update({ balance: newBalance }).eq('user_id', user.id)
      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: CREDIT_COSTS.batch_per_offer,
        balance_after: newBalance,
        type: 'refund',
        action: 'evaluation',
        description: 'Refund: job description not extractable',
      })
      return Response.json({ error: 'Job description could not be extracted' }, { status: 422 })
    }

    const archetype = detectArchetype(jdText)
    const systemPrompt = buildEvaluationSystemPrompt(cvDoc.content, archetype.name)

    const response = await anthropic.messages.create({
      model: MODELS.evaluation,
      max_tokens: 8000,
      system: systemPrompt,
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
      })
    }

    // Mark pipeline item as done — clear any previous error message
    await db.from('pipeline_items').update({
      status: 'done',
      company,
      title: role,
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
