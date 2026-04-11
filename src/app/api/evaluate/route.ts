import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildEvaluationSystemPrompt } from '@/lib/prompts/evaluation-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

/**
 * POST /api/evaluate
 *
 * Runs the evaluation synchronously inside the POST handler and returns the
 * full result inline. Simple, reliable, no background jobs / polling needed.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const { success: withinLimit } = rateLimit(`eval:${userId}`, 10, 60_000)
    if (!withinLimit) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    let body: { jd_text?: string; jd_url?: string }
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { jd_text, jd_url } = body

    if (!jd_text && !jd_url) {
      return Response.json({ error: 'Job description text or URL required' }, { status: 400 })
    }
    if (jd_text && jd_text.length > 50000) {
      return Response.json({ error: 'Job description too long (max 50,000 characters)' }, { status: 400 })
    }
    if (jd_url && (jd_url.length > 2000 || (!jd_url.startsWith('http://') && !jd_url.startsWith('https://')))) {
      return Response.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const ai = getAIClient()

    // Load CV before charging credits
    const { data: cvDoc } = await db
      .from('cv_documents')
      .select('content')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!cvDoc) {
      return Response.json({ error: 'No CV found. Please upload your CV in Settings.' }, { status: 400 })
    }

    // Deduct credits
    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: CREDIT_COSTS.evaluation,
      p_action: 'evaluation',
    }) as any

    if (!creditResult?.success) {
      return Response.json(
        { error: creditResult?.error || 'Insufficient credits', balance: creditResult?.balance },
        { status: 402 }
      )
    }

    const jd = jd_text || ''
    const archetype = detectArchetype(jd)
    const systemPrompt = buildEvaluationSystemPrompt(cvDoc.content, archetype.name)

    async function refund() {
      try {
        await db.rpc('add_credits', {
          p_user_id: userId,
          p_amount: CREDIT_COSTS.evaluation,
          p_action: 'evaluation_refund',
        })
      } catch {}
    }

    // Call Claude synchronously (no stream, no after)
    let evaluation: Record<string, unknown>
    try {
      const response = await ai.messages.create({
        model: MODELS.evaluation,
        max_tokens: 8000,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: `Evaluate this job description and return the complete evaluation as JSON:\n\n${jd}`,
          },
        ],
      })

      const text = response.content
        .filter(c => c.type === 'text')
        .map(c => (c as { type: 'text'; text: string }).text)
        .join('')

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      } catch {
        await refund()
        return Response.json({ error: 'Could not parse evaluation JSON. Credits refunded.' }, { status: 500 })
      }
    } catch (err) {
      await refund()
      return Response.json(
        { error: err instanceof Error ? err.message : 'Evaluation failed' },
        { status: 500 }
      )
    }

    const company =
      (evaluation.company as string) ||
      ((evaluation.block_a as Record<string, unknown>)?.company as string) ||
      'Unknown'
    const role =
      (evaluation.role as string) ||
      ((evaluation.block_a as Record<string, unknown>)?.role as string) ||
      ((evaluation.block_a as Record<string, unknown>)?.tldr as string) ||
      'Unknown'

    // Save the report (best effort — never block on this)
    let reportId: string | null = null
    try {
      const { data: report } = await db
        .from('reports')
        .insert({
          user_id: userId,
          company,
          role,
          archetype: evaluation.archetype || archetype.name,
          score: evaluation.score || 0,
          jd_text: jd,
          jd_url: jd_url || null,
          block_a: evaluation.block_a,
          block_b: evaluation.block_b,
          block_c: evaluation.block_c,
          block_d: evaluation.block_d,
          block_e: evaluation.block_e,
          block_f: evaluation.block_f,
          block_g: evaluation.block_g || null,
          keywords: evaluation.keywords || [],
        })
        .select('id')
        .single()

      reportId = report?.id || null

      // Story bank inserts (best-effort, uses service role to bypass RLS if user lacks insert policy)
      if (report && evaluation.block_f) {
        const blockF = evaluation.block_f as {
          stories?: Array<{
            requirement?: string
            title?: string
            situation?: string
            task?: string
            action?: string
            result?: string
            reflection?: string
          }>
        }
        if (blockF.stories?.length) {
          const storyRows = blockF.stories.map(s => ({
            user_id: userId,
            title: s.title || 'Untitled Story',
            jd_requirement: s.requirement || null,
            situation: s.situation || null,
            task: s.task || null,
            action: s.action || null,
            result: s.result || null,
            reflection: s.reflection || null,
            tags: [evaluation.archetype || archetype.name, company].filter(Boolean) as string[],
            source_report_id: report.id,
          }))
          try {
            const admin = createServiceClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            await (admin as any).from('story_bank').insert(storyRows)
          } catch (storyErr) {
            console.error('Story bank insert failed:', storyErr)
          }
        }
      }

      // Applications row
      if (report) {
        const { count } = await db
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        await db.from('applications').insert({
          user_id: userId,
          sequence_number: (count || 0) + 1,
          company,
          role,
          score: evaluation.score || 0,
          status: 'Evaluated',
          report_id: report.id,
        })
      }
    } catch (err) {
      console.error('Evaluation save error:', err)
      // Don't fail the whole request — user still gets the evaluation result
    }

    return Response.json({
      success: true,
      result: evaluation,
      score: evaluation.score || 0,
      archetype: evaluation.archetype || archetype.name,
      report_id: reportId,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
