import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildEvaluationSystemPrompt } from '@/lib/prompts/evaluation-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 10 evaluations per minute per user
  const { success: withinLimit } = rateLimit(`eval:${user.id}`, 10, 60_000)
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

  // Validate Anthropic client is configured before spending credits
  const anthropic = getAnthropicClient()

  // Get user's CV before spending credits too
  const { data: cvDoc } = await db
    .from('cv_documents')
    .select('content')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!cvDoc) {
    return Response.json({ error: 'No CV found. Please upload your CV in Settings.' }, { status: 400 })
  }

  // Deduct credits (only after all pre-checks pass)
  const { data: creditResult } = await db.rpc('deduct_credits', {
    p_user_id: user.id,
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

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: { type: string; data: unknown }) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        send({ type: 'status', data: 'Starting evaluation...' })

        const response = await anthropic.messages.create({
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
          .filter((block) => block.type === 'text')
          .map((block) => (block as { type: 'text'; text: string }).text)
          .join('')

        // Try to parse JSON from response
        let evaluation: Record<string, unknown>
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        } catch {
          // If JSON parsing fails, send raw text
          send({ type: 'text', data: text })
          send({ type: 'error', data: { message: 'Could not parse evaluation JSON' } })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        // Send blocks
        const blockMap = [
          { key: 'block_a', title: 'A) Role Summary' },
          { key: 'block_b', title: 'B) CV Match' },
          { key: 'block_c', title: 'C) Level & Strategy' },
          { key: 'block_d', title: 'D) Comp & Demand' },
          { key: 'block_e', title: 'E) Customization Plan' },
          { key: 'block_f', title: 'F) Interview Plan' },
          { key: 'block_g', title: 'G) Draft Answers' },
        ]

        for (const block of blockMap) {
          if (evaluation[block.key]) {
            send({ type: 'block', data: { key: block.key, title: block.title, content: evaluation[block.key] } })
          }
        }

        // Send score
        send({
          type: 'score',
          data: {
            score: evaluation.score || 0,
            archetype: evaluation.archetype || archetype.name,
          },
        })

        // Save report to database
        const company = (evaluation.company as string) || (evaluation.block_a as Record<string, unknown>)?.company as string || 'Unknown'
        const role = (evaluation.role as string) || (evaluation.block_a as Record<string, unknown>)?.role as string || (evaluation.block_a as Record<string, unknown>)?.tldr as string || 'Unknown'

        const { data: report } = await db
          .from('reports')
          .insert({
            user_id: user.id,
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

        // Save STAR stories to story bank (from Block F)
        if (report && evaluation.block_f) {
          const blockF = evaluation.block_f as { stories?: Array<{ requirement?: string; title?: string; situation?: string; task?: string; action?: string; result?: string; reflection?: string }> }
          if (blockF.stories?.length) {
            const storyRows = blockF.stories.map(s => ({
              user_id: user.id,
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
            const adminDb = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
            const { error: storyError } = await adminDb.from('story_bank').insert(storyRows)
            if (storyError) console.error('Story bank insert failed:', storyError.message)
          }
        }

        // Create application entry
        if (report) {
          const { count } = await db
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

          await db.from('applications').insert({
            user_id: user.id,
            sequence_number: (count || 0) + 1,
            company,
            role,
            score: evaluation.score || 0,
            status: 'Evaluated',
            report_id: report.id,
          })

          send({ type: 'saved', data: { report_id: report.id } })
        }
      } catch (err) {
        send({ type: 'error', data: { message: err instanceof Error ? err.message : 'Evaluation failed' } })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
