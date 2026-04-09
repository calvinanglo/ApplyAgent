import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildCoverLetterSystemPrompt } from '@/lib/prompts/cover-letter-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { CREDIT_COSTS, getModelTier, type ModelTierId } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { success: withinLimit } = rateLimit(`cl:${user.id}`, 10, 60_000)
    if (!withinLimit) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    let body: { jd_text?: string; report_id?: string; force?: boolean; model_tier?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Check for existing cover letter for this report
    if (body.report_id && !body.force) {
      const { data: existing } = await db
        .from('generated_files')
        .select('file_name, created_at')
        .eq('user_id', user.id)
        .eq('file_type', 'cover_letter')
        .eq('report_id', body.report_id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (existing?.length) {
        return Response.json({
          already_exists: true,
          file_name: existing[0].file_name,
          created_at: existing[0].created_at,
        })
      }
    }

    if (!body.jd_text && !body.report_id) {
      return Response.json({ error: 'Job description or report ID required' }, { status: 400 })
    }
    if (body.jd_text && body.jd_text.length > 50000) {
      return Response.json({ error: 'Job description too long (max 50,000 characters)' }, { status: 400 })
    }

    const anthropic = getAnthropicClient()

    const [cvRes, profileRes] = await Promise.all([
      db.from('cv_documents').select('content').eq('user_id', user.id).eq('is_active', true).single(),
      db.from('profiles').select('github_url, linkedin_url, portfolio_url, full_name, email, phone, location').eq('id', user.id).single(),
    ])
    const cvDoc = cvRes.data
    const userProfile = profileRes.data
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    let cvContent = cvDoc.content
    if (userProfile?.github_url && !cvContent.includes('github.com')) {
      cvContent += `\n\nGitHub: ${userProfile.github_url}`
    }
    if (userProfile?.linkedin_url && !cvContent.includes('linkedin.com')) {
      cvContent += `\nLinkedIn: ${userProfile.linkedin_url}`
    }

    // Load all report data in one fetch
    let jdText = body.jd_text || ''
    let reportContext = ''
    let evalContext = ''
    let reportKeywords: string[] = []
    let reportCompany = ''
    let reportRole = ''

    if (body.report_id) {
      const { data: report } = await db
        .from('reports')
        .select('jd_text, company, role, score, archetype, keywords, block_a, block_b')
        .eq('id', body.report_id)
        .eq('user_id', user.id)
        .single()

      if (report) {
        reportCompany = report.company || ''
        reportRole = report.role || ''
        if (report.jd_text) jdText = report.jd_text
        if (report.keywords) reportKeywords = report.keywords
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

        // If no JD text, reconstruct context from report data
        if (!jdText && report.company && report.role) {
          const parts = [`Job: ${report.role} at ${report.company}`]
          if (reportKeywords.length) parts.push(`Key requirements: ${reportKeywords.join(', ')}`)
          if (report.block_a?.tldr) parts.push(`Role summary: ${report.block_a.tldr}`)
          if (report.block_b?.gaps) {
            const gaps = Array.isArray(report.block_b.gaps)
              ? report.block_b.gaps.map((g: any) => typeof g === 'string' ? g : g.skill || g.requirement).join(', ')
              : ''
            if (gaps) parts.push(`Areas to address: ${gaps}`)
          }
          jdText = parts.join('\n')
        }
      }
    }

    const tier = getModelTier((body.model_tier as ModelTierId) || 'fast')
    const creditCost = tier.clCredits

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: 'cover_letter',
    }) as any
    if (!creditResult?.success) {
      return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })
    }

    const archetype = detectArchetype(jdText)
    const systemPrompt = buildCoverLetterSystemPrompt(cvContent, archetype.name)

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const response = await anthropic.messages.create({
      model: tier.model,
      max_tokens: 2000,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Today's date is ${today}.

Job description:\n\n${jdText}${reportContext ? `\n\nEvaluation summary:\n${reportContext}` : ''}${evalContext}

Write the cover letter following your instructions. Use today's date in the header.`,
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

    // Strip em dashes, en dashes, and hyphen-as-dash that the model sometimes inserts despite instructions
    if (Array.isArray(result.body_paragraphs)) {
      result.body_paragraphs = (result.body_paragraphs as string[]).map(p =>
        p.replace(/\s*[—–]\s*/g, '. ').replace(/\s+-\s+/g, '. ')
      )
    }

    // Save cover letter record + upload JSON to storage for re-download
    try {
      const company = reportCompany || (result as any).header?.recipient_company || 'Unknown'
      const role = reportRole || 'Cover Letter'
      const clFilename = `Cover-Letter-${company}-${role}`.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-').slice(0, 80)
      const jsonPath = `${user.id}/${clFilename}.json`
      await supabase.storage
        .from('generated-files')
        .upload(jsonPath, JSON.stringify(result), {
          contentType: 'application/json',
          upsert: true,
        })
      await db.from('generated_files').insert({
        user_id: user.id,
        file_type: 'cover_letter',
        file_name: clFilename,
        storage_path: jsonPath,
        report_id: body.report_id || null,
      })

      // Mark has_cover_letter on application (best-effort)
      if (body.report_id) {
        await db.from('applications').update({ has_cover_letter: true }).eq('report_id', body.report_id).eq('user_id', user.id)
      }
    } catch {}

    return Response.json({ success: true, cover_letter: result })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
