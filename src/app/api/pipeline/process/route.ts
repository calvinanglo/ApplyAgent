import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildEvaluationSystemPrompt } from '@/lib/prompts/evaluation-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/background-job'
import { fetchJdFromUrl } from './fetchers'

export const maxDuration = 300 // 5 minutes — evaluation + URL fetch + DB can take time

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = await rateLimit(`process:${user.id}`, 10, 60_000)
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

    // Capture closure-safe values before scheduling background work
    const userId = user.id
    const itemId = item.id
    const itemUrl = item.url
    const itemCompany = item.company
    const itemTitle = item.title
    const cvContent = cvDoc.content

    // Run the Claude call + DB writes in after() so the HTTP request can return
    // immediately. This lets the work survive mobile tab suspension — the
    // client's 5-second pipeline_items poll will pick up the final status.
    after(async () => {
      const admin = getServiceClient() as any

      try {
        const archetype = detectArchetype(jdText)
        const systemPrompt = buildEvaluationSystemPrompt(cvContent, archetype.name)

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
          await admin.from('pipeline_items').update({ status: 'error', error_message: 'Failed to parse evaluation' }).eq('id', itemId)
          return
        }

        const company = (evaluation.company as string) || itemCompany || 'Unknown'
        const role = (evaluation.role as string) || itemTitle || 'Unknown'

        const { data: report } = await admin.from('reports').insert({
          user_id: userId,
          company,
          role,
          archetype: evaluation.archetype || archetype.name,
          score: evaluation.score || 0,
          jd_text: jdText,
          jd_url: itemUrl,
          block_a: evaluation.block_a,
          block_b: evaluation.block_b,
          block_c: evaluation.block_c,
          block_d: evaluation.block_d,
          block_e: evaluation.block_e,
          block_f: evaluation.block_f,
          block_g: evaluation.block_g || null,
          keywords: evaluation.keywords || [],
        }).select('id').single()

        if (report) {
          const { count } = await admin.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId)
          await admin.from('applications').insert({
            user_id: userId,
            sequence_number: (count || 0) + 1,
            company,
            role,
            score: evaluation.score || 0,
            status: 'Evaluated',
            report_id: report.id,
            location: jdLocation,
          })
        }

        await admin.from('pipeline_items').update({
          status: 'done',
          company,
          title: role,
          location: jdLocation,
          report_id: report?.id || null,
          score: evaluation.score || 0,
          error_message: null,
          processed_at: new Date().toISOString(),
        }).eq('id', itemId)
      } catch (err) {
        console.error('Pipeline worker error:', err)
        await admin.from('pipeline_items').update({
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Evaluation failed',
        }).eq('id', itemId)
      }
    })

    // Return immediately — client polls pipeline_items status
    return Response.json({
      success: true,
      started: true,
      pipeline_item_id: itemId,
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
