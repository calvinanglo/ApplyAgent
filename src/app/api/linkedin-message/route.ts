import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildLinkedInSystemPrompt } from '@/lib/prompts/linkedin-system'
import { CREDIT_COSTS } from '@/lib/credits'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { company: string; role: string; jd_text?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.company || !body.role) return Response.json({ error: 'Company and role required' }, { status: 400 })

    const anthropic = getAnthropicClient()
    const { data: cvDoc } = await db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single()
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id, p_amount: CREDIT_COSTS.linkedin_message, p_action: 'linkedin_message',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const systemPrompt = buildLinkedInSystemPrompt(cvDoc.content)
    const response = await anthropic.messages.create({
      model: MODELS.quick,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate LinkedIn connection messages for: ${body.company} — ${body.role}${body.jd_text ? `\n\nJD:\n${body.jd_text.slice(0, 2000)}` : ''}` }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch { result = {} }

    return Response.json({ success: true, messages: result })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
