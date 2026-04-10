import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildLinkedInSystemPrompt } from '@/lib/prompts/linkedin-system'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = rateLimit(`linkedin:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { company: string; role: string; jd_text?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.company || !body.role) return Response.json({ error: 'Company and role required' }, { status: 400 })
    if (body.company.length > 200) return Response.json({ error: 'Company name too long' }, { status: 400 })
    if (body.role.length > 200) return Response.json({ error: 'Role too long' }, { status: 400 })
    if (body.jd_text && body.jd_text.length > 50000) return Response.json({ error: 'JD text too long' }, { status: 400 })

    const ai = getAIClient()
    const { data: cvDoc } = await db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single()
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id, p_amount: CREDIT_COSTS.linkedin_message, p_action: 'linkedin_message',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const systemPrompt = buildLinkedInSystemPrompt(cvDoc.content)
    const response = await ai.messages.create({
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
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
