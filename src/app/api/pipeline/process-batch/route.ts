import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildEvaluationSystemBlocks } from '@/lib/prompts/evaluation-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/background-job'
import { fetchJdFromUrl } from '../process/fetchers'

export const maxDuration = 300

/**
 * POST /api/pipeline/process-batch
 *
 * Accepts { ids: string[] } and starts processing every item in a single
 * request. Each item's long-running work (URL fetch, Claude eval, DB writes)
 * runs inside its own after() callback, so:
 *
 *  - The HTTP response returns in < 2s regardless of batch size
 *  - Every item is "handed off" before the client even knows the request
 *    finished, so closing the tab / navigating away / putting the phone to
 *    sleep does NOT prevent items from being processed
 *  - Credits are deducted upfront per-item and refunded per-item on failure
 *
 * The client keeps polling `pipeline_items` for status updates (already in
 * place on the pipeline page). No new jobs table needed.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = user.id

    const { success: withinLimit } = await rateLimit(`process-batch:${userId}`, 5, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { ids: string[] }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return Response.json({ error: 'ids[] required' }, { status: 400 })
    }
    if (body.ids.length > 100) {
      return Response.json({ error: 'Max 100 items per batch' }, { status: 400 })
    }

    // Load all pipeline items at once (RLS ensures only user's own)
    const { data: items } = await db
      .from('pipeline_items')
      .select('id, url, company, title, location, status')
      .eq('user_id', userId)
      .in('id', body.ids)

    if (!items?.length) {
      return Response.json({ error: 'No pipeline items found' }, { status: 404 })
    }

    // Only process items that are in a startable state
    const startable = items.filter((i: any) => i.status === 'pending' || i.status === 'error')
    if (!startable.length) {
      return Response.json({ error: 'No items in pending/error status' }, { status: 400 })
    }

    // Load CV once — all items share it
    const { data: cvDoc } = await db
      .from('cv_documents')
      .select('content')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    if (!cvDoc) return Response.json({ error: 'No CV found' }, { status: 400 })
    const cvContent = cvDoc.content

    // Mark all as processing immediately so the UI reflects state on next poll
    await db.from('pipeline_items').update({ status: 'processing', error_message: null }).in('id', startable.map((i: any) => i.id))

    // Validate AI client before we start firing after() callbacks
    const ai = getAIClient()

    // Fire a separate after() callback per item so they run in parallel and
    // each item's credit lifecycle is independent.
    for (const item of startable) {
      const itemId = item.id
      const itemUrl = item.url
      const itemCompany = item.company
      const itemTitle = item.title
      const itemLocation = item.location

      after(async () => {
        const admin = getServiceClient() as any

        async function markError(message: string) {
          await admin.from('pipeline_items').update({
            status: 'error',
            error_message: message,
          }).eq('id', itemId)
        }

        async function refund(reason: string) {
          try {
            await admin.rpc('add_credits', { p_user_id: userId, p_amount: CREDIT_COSTS.batch_per_offer, p_action: reason })
          } catch {}
        }

        try {
          // Deduct credits per item (atomic — safe against race conditions)
          const { data: creditResult } = await admin.rpc('deduct_credits', {
            p_user_id: userId,
            p_amount: CREDIT_COSTS.batch_per_offer,
            p_action: 'evaluation',
          })
          if (!creditResult?.success) {
            await markError('Insufficient credits')
            return
          }

          // Fetch the JD text — this shares the same helpers as the single-item route
          let jdText = ''
          let jdLocation: string | null = itemLocation
          try {
            const result = await fetchJdFromUrl(itemUrl)
            jdText = result.text
            if (result.location) jdLocation = result.location
          } catch (err) {
            await refund('refund_fetch_fail')
            await markError(err instanceof Error ? err.message : 'Failed to fetch URL')
            return
          }

          if (!jdText || jdText.trim().length < 150) {
            await refund('refund_jd_short')
            await markError('Job description too short or could not be extracted from page')
            return
          }

          const archetype = detectArchetype(jdText)
          const systemBlocks = buildEvaluationSystemBlocks(cvContent)

          const response = await ai.messages.create({
            model: MODELS.evaluation,
            max_tokens: 8000,
            system: systemBlocks,
            messages: [{ role: 'user', content: `Archetype: ${archetype.name}\n\nEvaluate this job description and return the complete evaluation as JSON:\n\n${jdText}` }],
          })

          const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
          let evaluation: Record<string, unknown>
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
          } catch {
            await refund('refund_parse_fail')
            await markError('Failed to parse evaluation')
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
          console.error('Batch pipeline worker error:', err)
          await markError(err instanceof Error ? err.message : 'Evaluation failed')
        }
      })
    }

    return Response.json({
      success: true,
      started: startable.length,
      skipped: items.length - startable.length,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
