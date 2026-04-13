import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildApplySystemPrompt } from '@/lib/prompts/apply-system'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = await rateLimit(`apply:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { questions: string[]; company: string; role: string; report_id?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.questions?.length) return Response.json({ error: 'Questions required' }, { status: 400 })
    if (body.questions.length > 20) return Response.json({ error: 'Maximum 20 questions per request' }, { status: 400 })
    if (body.questions.some((q: string) => typeof q !== 'string' || q.length > 2000)) return Response.json({ error: 'Each question must be under 2000 characters' }, { status: 400 })
    if (body.company && body.company.length > 200) return Response.json({ error: 'Company name too long' }, { status: 400 })
    if (body.role && body.role.length > 200) return Response.json({ error: 'Role too long' }, { status: 400 })

    const ai = getAIClient()
    const { data: cvDoc } = await db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single()
    if (!cvDoc) return Response.json({ error: 'No CV found.' }, { status: 400 })

    let reportContext = ''
    if (body.report_id) {
      const { data: report } = await db.from('reports').select('block_f, block_g').eq('id', body.report_id).eq('user_id', user.id).single()
      if (report?.block_g) reportContext = JSON.stringify(report.block_g)
    }

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id, p_amount: CREDIT_COSTS.apply_assist, p_action: 'apply_assist',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const systemPrompt = buildApplySystemPrompt(cvDoc.content, reportContext)
    const questionsText = body.questions.map((q, i) => `${i+1}. ${q}`).join('\n')
    const response = await ai.messages.create({
      model: MODELS.quick,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Application for: ${body.company} — ${body.role}\n\nForm questions:\n${questionsText}` }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch { result = {} }

    return Response.json({ success: true, answers: result })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
