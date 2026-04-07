import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, MODELS } from '@/lib/anthropic'
import { buildPdfSystemPrompt } from '@/lib/prompts/pdf-system'
import { detectArchetype } from '@/lib/prompts/shared-context'
import { buildResumeHtml, type PdfContent } from '@/lib/pdf/generator'
import { getPdfBuffer } from '@/lib/pdf/chromium'
import { CREDIT_COSTS } from '@/lib/credits'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { jd_text?: string; report_id?: string }
    try { body = await request.json() }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }) }

    const anthropic = getAnthropicClient()

    const { data: cvDoc } = await db
      .from('cv_documents')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (!cvDoc) return Response.json({ error: 'No CV found. Upload your CV in Settings.' }, { status: 400 })

    // Load JD text from report if provided
    let jdText = body.jd_text || ''
    if (body.report_id && !jdText) {
      const { data: report } = await db.from('reports').select('jd_text').eq('id', body.report_id).single()
      if (report?.jd_text) jdText = report.jd_text
    }

    const { data: creditResult } = await db.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.pdf,
      p_action: 'pdf',
    }) as any
    if (!creditResult?.success) return Response.json({ error: creditResult?.error || 'Insufficient credits' }, { status: 402 })

    const archetype = detectArchetype(jdText || cvDoc.content)
    const systemPrompt = buildPdfSystemPrompt(cvDoc.content, archetype.name)

    // Generate tailored CV content via Claude
    const response = await anthropic.messages.create({
      model: MODELS.pdf,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: jdText
          ? `Tailor my resume for this job description:\n\n${jdText}`
          : 'Generate a well-formatted resume from my CV. No specific JD — use a general IT/Security/Network focus.',
      }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let content: PdfContent
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      content = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      return Response.json({ error: 'Failed to parse CV content from AI response' }, { status: 500 })
    }

    // Build HTML from template
    const html = buildResumeHtml(content)

    // Generate PDF
    const format = content.paper_format === 'a4' ? 'a4' : 'letter'
    const pdfBuffer = await getPdfBuffer(html, format)

    // Upload to Supabase Storage
    const filename = `resume-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-files')
      .upload(`${user.id}/${filename}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      // If storage fails, return PDF directly
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Keywords': (content.keywords_extracted || []).slice(0, 10).join(','),
        },
      })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('generated-files').getPublicUrl(`${user.id}/${filename}`)

    // Save to generated_files table
    await db.from('generated_files').insert({
      user_id: user.id,
      file_type: 'resume_pdf',
      filename,
      storage_path: `${user.id}/${filename}`,
      public_url: publicUrl,
      report_id: body.report_id || null,
      metadata: {
        keywords: content.keywords_extracted,
        keyword_coverage_pct: content.keyword_coverage_pct,
        archetype: archetype.name,
        paper_format: format,
      },
    })

    return Response.json({
      success: true,
      url: publicUrl,
      filename,
      keywords: content.keywords_extracted,
      keyword_coverage_pct: content.keyword_coverage_pct,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
