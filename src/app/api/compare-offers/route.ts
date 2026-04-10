import { createClient } from '@/lib/supabase/server'
import { getAIClient, MODELS } from '@/lib/ai'
import { buildCompareOffersSystemPrompt } from '@/lib/prompts/compare-offers-system'
import { CREDIT_COSTS } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = rateLimit(`compare:${user.id}`, 10, 60_000)
    if (!withinLimit) return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

    let body: { offers: Array<{ company: string; role: string; jd_text?: string }> }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!body.offers || body.offers.length < 2) return Response.json({ error: 'At least 2 offers required' }, { status: 400 })
    if (body.offers.length > 10) return Response.json({ error: 'Maximum 10 offers per comparison' }, { status: 400 })
    for (const o of body.offers) {
      if (o.company?.length > 200 || o.role?.length > 200) return Response.json({ error: 'Company/role names too long' }, { status: 400 })
      if (o.jd_text && o.jd_text.length > 50000) return Response.json({ error: 'JD text too long' }, { status: 400 })
    }

    const ai = getAIClient()
    const { data: cvDoc } = await db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single()
    if (!cvDoc) return Response.json({ error: 'No CV found.' }, { status: 400 })

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id, p_amount: CREDIT_COSTS.compare_offers, p_action: 'compare_offers',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const systemPrompt = buildCompareOffersSystemPrompt(cvDoc.content)
    const offersText = body.offers.map((o, i) =>
      `Offer ${i+1}:\nCompany: ${o.company}\nRole: ${o.role}${o.jd_text ? `\n${o.jd_text.slice(0, 2000)}` : ''}`
    ).join('\n\n---\n\n')

    const response = await ai.messages.create({
      model: MODELS.evaluation,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Compare these offers:\n\n${offersText}` }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch { result = {} }

    return Response.json({ success: true, comparison: result })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
