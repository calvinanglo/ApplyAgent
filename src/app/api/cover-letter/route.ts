import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildCoverLetterSystemPrompt } from '@/lib/prompts/cover-letter-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS } from '@/lib/credits'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { jd_text?: string; report_id?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    if (!body.jd_text && !body.report_id) {
      return Response.json({ error: 'Job description or report ID required' }, { status: 400 })
    }

    const anthropic = getAnthropicClient()

    const { data: cvDoc } = await db
      .from('cv_documents')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    // Load all report data in one fetch
    let jdText = body.jd_text || ''
    let reportContext = ''
    let evalContext = ''

    if (body.report_id) {
      const { data: report } = await db
        .from('reports')
        .select('jd_text, company, role, score, archetype, block_b')
        .eq('id', body.report_id)
        .single()

      if (report) {
        jdText = report.jd_text || jdText
        reportContext = `Company: ${report.company}\nRole: ${report.role}\nScore: ${report.score}/5\nArchetype: ${report.archetype}`

        // Pull strong CV matches from the evaluation to help tailoring
        if (report.block_b?.requirements) {
          const strongMatches = (report.block_b.requirements as any[])
            .filter((r: any) => r.strength === 'strong')
            .slice(0, 5)
            .map((r: any) => `- ${r.requirement}: ${r.cv_match}`)
            .join('\n')
          if (strongMatches) {
            evalContext = `\n\nStrong CV matches already confirmed by evaluation (use these as the backbone):\n${strongMatches}`
          }
        }
      }
    }

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.cover_letter,
      p_action: 'cover_letter',
    }) as any
    if (!creditResult?.success) {
      return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })
    }

    const archetype = detectArchetype(jdText)
    const systemPrompt = buildCoverLetterSystemPrompt(cvDoc.content, archetype.name)

    const response = await anthropic.messages.create({
      model: MODELS.cover_letter,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Here is the full job description:\n\n${jdText}${reportContext ? `\n\nEvaluation summary:\n${reportContext}` : ''}${evalContext}

Step 1: Extract the company name, role title, and the 3 most important requirements from the JD above.
Step 2: For each requirement, find the specific matching evidence in my CV.
Step 3: Write the cover letter using that mapping. The company name must appear in the opening paragraph. Every paragraph must reference something specific from the JD and connect it to something real from my CV.`,
      }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { body_paragraphs: [text] }
    } catch {
      result = { body_paragraphs: [text] }
    }

    return Response.json({ success: true, cover_letter: result })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
