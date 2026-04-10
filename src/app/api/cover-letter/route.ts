import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai'
import { buildCoverLetterSystemPrompt } from '@/lib/prompts/cover-letter-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { getModelTier, type ModelTierId } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'
import { createJob, startJob, completeJob, failJob, getServiceClient } from '@/lib/background-job'

export const maxDuration = 60

/**
 * POST /api/cover-letter
 *
 * Starts a cover letter generation job asynchronously. Returns { job_id }.
 * Client polls /api/jobs/status?id=... The Claude call runs inside after() so
 * it survives mobile tab suspension / phone sleep.
 *
 * Legacy response for cached existing cover letters is still returned inline.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = user.id

    const { success: withinLimit } = rateLimit(`cl:${userId}`, 10, 60_000)
    if (!withinLimit) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    let body: { jd_text?: string; report_id?: string; force?: boolean; model_tier?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Check for existing cover letter for this report — returned inline (fast)
    if (body.report_id && !body.force) {
      const { data: existing } = await db
        .from('generated_files')
        .select('file_name, created_at')
        .eq('user_id', userId)
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

    // Validate AI client up front
    getAIClient()

    // Load CV + profile before touching credits
    const [cvRes, profileRes] = await Promise.all([
      db.from('cv_documents').select('content').eq('user_id', userId).eq('is_active', true).single(),
      db.from('profiles').select('github_url, linkedin_url, portfolio_url, full_name, email, phone, location').eq('id', userId).single(),
    ])
    const cvDoc = cvRes.data
    const userProfile = profileRes.data
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    const tier = getModelTier((body.model_tier as ModelTierId) || 'fast')
    const creditCost = tier.clCredits

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_action: 'cover_letter',
    }) as any
    if (!creditResult?.success) {
      return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })
    }

    const jobId = await createJob(db, userId, 'cover_letter', {
      jd_text: body.jd_text || null,
      report_id: body.report_id || null,
      model_tier: tier.id,
    })

    if (!jobId) {
      await db.rpc('add_credits', { p_user_id: userId, p_amount: creditCost, p_action: 'refund_cl_fail' }).catch(() => {})
      return Response.json({ error: 'Failed to create job' }, { status: 500 })
    }

    after(async () => {
      try {
        await startJob(jobId)
        const ai = getAIClient()
        const admin = getServiceClient() as any

        let cvContent = cvDoc.content
        if (userProfile?.github_url && !cvContent.includes('github.com')) {
          cvContent += `\n\nGitHub: ${userProfile.github_url}`
        }
        if (userProfile?.linkedin_url && !cvContent.includes('linkedin.com')) {
          cvContent += `\nLinkedIn: ${userProfile.linkedin_url}`
        }

        let jdText = body.jd_text || ''
        let reportContext = ''
        let evalContext = ''
        let reportKeywords: string[] = []
        let reportCompany = ''
        let reportRole = ''

        if (body.report_id) {
          const { data: report } = await admin
            .from('reports')
            .select('jd_text, company, role, score, archetype, keywords, block_a, block_b')
            .eq('id', body.report_id)
            .eq('user_id', userId)
            .single()

          if (report) {
            reportCompany = report.company || ''
            reportRole = report.role || ''
            if (report.jd_text) jdText = report.jd_text
            if (report.keywords) reportKeywords = report.keywords
            reportContext = `Company: ${report.company}\nRole: ${report.role}\nScore: ${report.score}/5\nArchetype: ${report.archetype}`

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

        const archetype = detectArchetype(jdText)
        const systemPrompt = buildCoverLetterSystemPrompt(cvContent, archetype.name)
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        const response = await ai.messages.create({
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

        if (Array.isArray(result.body_paragraphs)) {
          result.body_paragraphs = (result.body_paragraphs as string[]).map(p =>
            p.replace(/\s*[—–]\s*/g, '. ').replace(/\s+-\s+/g, '. ')
          )
        }

        // Save cover letter record + upload JSON to storage
        try {
          const company = reportCompany || (result as any).header?.recipient_company || 'Unknown'
          const role = reportRole || 'Cover Letter'
          const clFilename = `Cover-Letter-${company}-${role}`.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-').slice(0, 80)
          const jsonPath = `${userId}/${clFilename}.json`

          // Upload via service role storage (bypasses user session)
          const { error: uploadErr } = await admin.storage
            .from('generated-files')
            .upload(jsonPath, JSON.stringify(result), {
              contentType: 'application/json',
              upsert: true,
            })
          if (uploadErr) console.error('CL upload failed:', uploadErr.message)

          await admin.from('generated_files').insert({
            user_id: userId,
            file_type: 'cover_letter',
            file_name: clFilename,
            storage_path: jsonPath,
            report_id: body.report_id || null,
          })

          if (body.report_id) {
            await admin.from('applications').update({ has_cover_letter: true }).eq('report_id', body.report_id).eq('user_id', userId)
          }
        } catch (e) {
          console.error('CL save error:', e)
        }

        await completeJob(jobId, { cover_letter: result })
      } catch (err) {
        console.error('Cover letter worker error:', err)
        await failJob(jobId, err instanceof Error ? err.message : 'Cover letter generation failed')
      }
    })

    return Response.json({ job_id: jobId })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
