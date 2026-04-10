import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai'
import { buildPdfSystemPrompt } from '@/lib/prompts/pdf-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { buildResumeHtml, type PdfContent } from '@/lib/pdf/generator'
import { getPdfBuffer } from '@/lib/pdf/chromium'
import { getModelTier, type ModelTierId } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'
import { createJob, startJob, completeJob, failJob, getServiceClient } from '@/lib/background-job'

export const maxDuration = 60

/**
 * POST /api/generate-pdf
 *
 * Starts a resume PDF generation job asynchronously. Returns { job_id }.
 * The AI call + Chromium PDF generation + storage upload all run inside
 * after() so the work survives client disconnection (mobile sleep).
 *
 * Cached existing resumes are returned inline for speed.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = user.id

    const { success: withinLimit } = rateLimit(`pdf:${userId}`, 10, 60_000)
    if (!withinLimit) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    let body: { jd_text?: string; report_id?: string; force?: boolean; model_tier?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    // Cached existing resume — return inline
    if (body.report_id && !body.force) {
      const { data: existing } = await db
        .from('generated_files')
        .select('file_name, created_at, storage_path')
        .eq('user_id', userId)
        .eq('file_type', 'resume')
        .eq('report_id', body.report_id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (existing?.length) {
        return Response.json({
          already_exists: true,
          file_name: existing[0].file_name,
          created_at: existing[0].created_at,
          storage_path: existing[0].storage_path,
        })
      }
    }

    // Validate AI client + load CV/profile up front
    getAIClient()
    const [cvRes, profileRes] = await Promise.all([
      db.from('cv_documents').select('content').eq('user_id', userId).eq('is_active', true).single(),
      db.from('profiles').select('github_url, linkedin_url, portfolio_url, full_name, email, phone, location').eq('id', userId).single(),
    ])
    const cvDoc = cvRes.data
    const userProfile = profileRes.data
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    const tier = getModelTier((body.model_tier as ModelTierId) || 'fast')
    const creditCost = tier.pdfCredits

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_action: 'pdf',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const jobId = await createJob(db, userId, 'resume_pdf', {
      jd_text: body.jd_text || null,
      report_id: body.report_id || null,
      model_tier: tier.id,
    })

    if (!jobId) {
      await db.rpc('add_credits', { p_user_id: userId, p_amount: creditCost, p_action: 'refund_pdf_fail' }).catch(() => {})
      return Response.json({ error: 'Failed to create job' }, { status: 500 })
    }

    after(async () => {
      const admin = getServiceClient() as any

      async function refund(reason: string) {
        try {
          await admin.rpc('add_credits', { p_user_id: userId, p_amount: creditCost, p_action: reason })
        } catch {}
      }

      try {
        await startJob(jobId)
        const ai = getAIClient()

        let cvContent = cvDoc.content
        if (userProfile?.github_url && !cvContent.includes('github.com')) {
          cvContent += `\n\nGitHub: ${userProfile.github_url}`
        }
        if (userProfile?.linkedin_url && !cvContent.includes('linkedin.com')) {
          cvContent += `\nLinkedIn: ${userProfile.linkedin_url}`
        }
        if (userProfile?.portfolio_url && !cvContent.includes(userProfile.portfolio_url)) {
          cvContent += `\nPortfolio: ${userProfile.portfolio_url}`
        }

        if (userProfile?.github_url) {
          try {
            const ghMatch = userProfile.github_url.match(/github\.com\/([^/\s?#]+)/)
            if (ghMatch) {
              const ghUsername = ghMatch[1]
              const ghRes = await fetch(`https://api.github.com/users/${ghUsername}/repos?sort=updated&per_page=10`, {
                headers: { 'User-Agent': 'ApplyAgent/1.0' },
                signal: AbortSignal.timeout(5000),
              })
              if (ghRes.ok) {
                const repos = await ghRes.json() as Array<{ name: string; description: string | null; html_url: string; language: string | null; fork: boolean; updated_at: string }>
                const ownRepos = repos.filter(r => !r.fork && r.description)
                if (ownRepos.length > 0) {
                  cvContent += `\n\n## GitHub Repositories (real, from API — pick the ones most relevant to the JD)\n`
                  ownRepos.forEach(r => {
                    cvContent += `- ${r.name}: ${r.description} (${r.html_url}) [${r.language || 'N/A'}]\n`
                  })
                }
              }
            }
          } catch { /* GitHub fetch failed — continue without repos */ }
        }

        let jdText = body.jd_text || ''
        let reportKeywords: string[] = []
        let reportData: any = null
        if (body.report_id) {
          const { data: report } = await admin.from('reports').select('jd_text, jd_url, keywords, role, company, block_a, block_b').eq('id', body.report_id).eq('user_id', userId).single()
          reportData = report
          if (report?.jd_text && !jdText) jdText = report.jd_text
          if (report?.keywords) reportKeywords = report.keywords
        }

        const archetype = detectArchetype(jdText || cvContent)
        const systemPrompt = buildPdfSystemPrompt(cvContent, archetype.name)

        let userMessage = ''
        if (jdText) {
          userMessage = `Tailor my resume SPECIFICALLY for this job description. The resume must look like it was written exclusively for this role. Match the exact job title, use their terminology, and reorder everything to prioritize what THIS job cares about most.\n\nJob Description:\n\n${jdText}`
        } else if (reportData) {
          const parts = [`Tailor my resume SPECIFICALLY for this role. The resume must look like it was written exclusively for this position:`]
          if (reportData.company) parts.push(`Company: ${reportData.company}`)
          if (reportData.role) parts.push(`Exact Role Title: ${reportData.role} — use this title to frame the entire resume`)
          if (reportKeywords.length) parts.push(`Key requirements/keywords: ${reportKeywords.join(', ')}`)
          if (reportData.block_a?.tldr) parts.push(`Role summary: ${reportData.block_a.tldr}`)
          if (reportData.block_b?.match_pct) parts.push(`CV match: ${reportData.block_b.match_pct}%`)
          if (reportData.block_b?.strong_matches) {
            const matches = Array.isArray(reportData.block_b.strong_matches)
              ? reportData.block_b.strong_matches.map((m: any) => typeof m === 'string' ? m : m.skill || m.requirement).join(', ')
              : ''
            if (matches) parts.push(`Strong matches: ${matches}`)
          }
          if (reportData.block_b?.gaps) {
            const gaps = Array.isArray(reportData.block_b.gaps)
              ? reportData.block_b.gaps.map((g: any) => typeof g === 'string' ? g : g.skill || g.requirement).join(', ')
              : ''
            if (gaps) parts.push(`Gaps to address: ${gaps}`)
          }
          userMessage = parts.join('\n')
        } else {
          userMessage = 'Generate a well-formatted resume from my CV. No specific JD — use a general IT/Security/Network focus.'
        }

        const response = await ai.messages.create({
          model: tier.model,
          max_tokens: 8000,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userMessage }],
        })

        const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
        let content: PdfContent
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            await refund('refund_pdf_fail')
            await failJob(jobId, 'AI response did not contain valid JSON. Credits refunded.')
            return
          }
          content = JSON.parse(jsonMatch[0])
        } catch {
          await refund('refund_pdf_fail')
          await failJob(jobId, 'Failed to parse resume content. Credits refunded.')
          return
        }

        if (!(content.experience || []).length && !(content.summary || '').trim()) {
          await refund('refund_pdf_empty')
          await failJob(jobId, 'Resume generation produced empty content. Credits refunded.')
          return
        }

        if (userProfile?.github_url && !content.github_url) {
          content.github_url = userProfile.github_url
          const ghMatch = userProfile.github_url.match(/github\.com\/([^/\s?#]+)/)
          content.github_display = ghMatch ? `github.com/${ghMatch[1]}` : 'GitHub'
        }
        if (userProfile?.linkedin_url && !content.linkedin_url) {
          content.linkedin_url = userProfile.linkedin_url
          const liMatch = userProfile.linkedin_url.match(/linkedin\.com\/in\/([^/\s?#]+)/)
          content.linkedin_display = liMatch ? `linkedin.com/in/${liMatch[1]}` : 'LinkedIn'
        }
        if (userProfile?.portfolio_url && !content.portfolio_url) {
          content.portfolio_url = userProfile.portfolio_url
          content.portfolio_display = userProfile.portfolio_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
        }
        if (!userProfile?.portfolio_url) {
          content.portfolio_url = ''
          content.portfolio_display = ''
        }
        if (userProfile?.phone && !content.phone) {
          content.phone = userProfile.phone
        }

        const html = buildResumeHtml(content)
        const format = content.paper_format === 'a4' ? 'a4' : 'letter'
        const pdfBuffer = await getPdfBuffer(html, format)

        const initials = userProfile?.full_name
          ? userProfile.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase()
          : ''
        const roleSlug = reportData?.role
          ? `${reportData.company}-${reportData.role}`.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, '-').slice(0, 60)
          : Date.now().toString()
        const filename = `Resume-${initials ? initials + '-' : ''}${roleSlug}.pdf`

        const { error: uploadError } = await admin.storage
          .from('generated-files')
          .upload(`${userId}/${filename}`, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          })

        let publicUrl: string | null = null
        if (!uploadError) {
          const jsonFilename = filename.replace(/\.pdf$/, '.json')
          try {
            await admin.storage
              .from('generated-files')
              .upload(`${userId}/${jsonFilename}`, JSON.stringify(content), {
                contentType: 'application/json',
                upsert: true,
              })
          } catch {}
          const { data: pub } = admin.storage.from('generated-files').getPublicUrl(`${userId}/${filename}`)
          publicUrl = pub?.publicUrl || null
        }

        try {
          await admin.from('generated_files').insert({
            user_id: userId,
            file_type: 'resume',
            file_name: filename,
            storage_path: uploadError ? '' : `${userId}/${filename}`,
            report_id: body.report_id || null,
            keyword_coverage: content.keyword_coverage_pct || null,
          })
        } catch {}

        if (body.report_id) {
          try { await admin.from('applications').update({ has_pdf: true }).eq('report_id', body.report_id).eq('user_id', userId) } catch {}
        }

        await completeJob(jobId, {
          success: true,
          url: publicUrl,
          pdf_base64: Buffer.from(pdfBuffer).toString('base64'),
          filename,
          keywords: content.keywords_extracted,
          keyword_coverage_pct: content.keyword_coverage_pct,
          content,
        })
      } catch (err) {
        console.error('Resume PDF worker error:', err)
        await failJob(jobId, err instanceof Error ? err.message : 'Resume generation failed')
      }
    })

    return Response.json({ job_id: jobId })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
