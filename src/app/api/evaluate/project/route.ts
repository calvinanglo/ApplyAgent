import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildProjectSystemPrompt } from '@/lib/prompts/project-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = rateLimit(`project:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { project_description: string; target_role?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.project_description) return Response.json({ error: 'Project description required' }, { status: 400 })
    if (body.project_description.length > 50000) return Response.json({ error: 'Project description too long (max 50,000 characters)' }, { status: 400 })

    const anthropic = getAnthropicClient()
    const { data: cvDoc } = await db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single()
    if (!cvDoc) return Response.json({ error: 'No CV found.' }, { status: 400 })

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id, p_amount: CREDIT_COSTS.project_eval, p_action: 'project_eval',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const archetype = detectArchetype(body.target_role || body.project_description)
    const systemPrompt = buildProjectSystemPrompt(cvDoc.content, archetype.name)
    const response = await anthropic.messages.create({
      model: MODELS.quick,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Evaluate this portfolio project:\n\n${body.project_description}` }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch { result = {} }

    return Response.json({ success: true, evaluation: result })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
