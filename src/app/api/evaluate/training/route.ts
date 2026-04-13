import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildTrainingSystemPrompt } from '@/lib/prompts/training-system'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = await rateLimit(`training:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { course_description: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.course_description) return Response.json({ error: 'Course description required' }, { status: 400 })
    if (body.course_description.length > 50000) return Response.json({ error: 'Course description too long (max 50,000 characters)' }, { status: 400 })

    const ai = getAIClient()
    const { data: cvDoc } = await db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single()
    if (!cvDoc) return Response.json({ error: 'No CV found.' }, { status: 400 })

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id, p_amount: CREDIT_COSTS.training_eval, p_action: 'training_eval',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const systemPrompt = buildTrainingSystemPrompt(cvDoc.content)
    const response = await ai.messages.create({
      model: MODELS.quick,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Evaluate this training/certification:\n\n${body.course_description}` }],
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
