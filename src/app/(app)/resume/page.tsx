'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, FileDown, ExternalLink, CheckCircle, Search, Download, Eye, ArrowLeft, Mail, Copy, Check, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { FileUpload } from '@/components/ui/file-upload'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { MODEL_TIERS, type ModelTierId } from '@/lib/credits'
import { useBackgroundJob } from '@/lib/use-background-job'

interface Report {
  id: string
  report_id: string
  company: string
  role: string
  score: number
  created_at: string
}

function DocumentsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reportIdParam = searchParams.get('report_id')
  const tabParam = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>(tabParam === 'cover-letter' ? 'cover-letter' : 'resume')
  const [jdText, setJdText] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportIdParam)
  const [error, setError] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userInitials, setUserInitials] = useState('')

  // Resume state
  const [resumeResult, setResumeResult] = useState<{ url?: string; previewUrl?: string; pdf_base64?: string; filename?: string; keywords?: string[]; keyword_coverage_pct?: number; content?: any } | null>(null)
  const [resumeHistory, setResumeHistory] = useState<Array<{ storage_path: string; file_name: string; created_at: string; report_id?: string }>>([])
  const [selectedResumeHistory, setSelectedResumeHistory] = useState<Set<number>>(new Set())
  const [resumeDuplicateWarning, setResumeDuplicateWarning] = useState<{ file_name: string; created_at: string; storage_path?: string } | null>(null)

  // Cover letter state
  const [clResult, setClResult] = useState<{
    body_paragraphs: string[]; greeting?: string; closing?: string; word_count?: number; signature_name?: string
    header?: { candidate_name?: string; candidate_email?: string; candidate_phone?: string; candidate_location?: string; date?: string; recipient_company?: string; recipient_role?: string }
  } | null>(null)
  const [clHistory, setClHistory] = useState<Array<{ file_name: string; created_at: string; report_id?: string; storage_path?: string }>>([])
  const [selectedClHistory, setSelectedClHistory] = useState<Set<number>>(new Set())
  const [clDuplicateWarning, setClDuplicateWarning] = useState<{ file_name: string; created_at: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [modelTier, setModelTier] = useState<ModelTierId>('balanced')
  const [jdUrl, setJdUrl] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)

  // Background job runners — survive mobile sleep / reloads
  const resumeJob = useBackgroundJob<any>({
    storageKey: 'documents:resume-job',
    onComplete: (data) => {
      if (data?.pdf_base64) {
        const bytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))
        const file = new File([bytes], data.filename || 'resume.pdf', { type: 'application/pdf' })
        data.previewUrl = URL.createObjectURL(file)
        if (!data.url) data.url = data.previewUrl
      }
      setResumeResult(data)
    },
    onError: (msg) => setError(msg),
  })

  const clJob = useBackgroundJob<{ cover_letter: any }>({
    storageKey: 'documents:cover-letter-job',
    onComplete: (data) => {
      setClResult(data.cover_letter)
    },
    onError: (msg) => setError(msg),
  })

  const resumeLoading = resumeJob.loading
  const clLoading = clJob.loading

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/applications?limit=20')
        if (res.ok) {
          const data = await res.json()
          const items = Array.isArray(data) ? data : data.items || []
          setRecentReports(items.filter((a: any) => a.report_id))
        }
      } catch {}
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await (supabase as any).from('profiles').select('full_name').eq('id', user.id).single()
          if (data?.full_name) setUserInitials(data.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase())

          const [resumeFiles, clFiles] = await Promise.all([
            (supabase as any).from('generated_files').select('storage_path, file_name, created_at, report_id, keyword_coverage').eq('user_id', user.id).eq('file_type', 'resume').order('created_at', { ascending: false }).limit(20),
            (supabase as any).from('generated_files').select('file_name, created_at, report_id, storage_path').eq('user_id', user.id).eq('file_type', 'cover_letter').order('created_at', { ascending: false }).limit(20),
          ])
          if (resumeFiles.data) setResumeHistory(resumeFiles.data)
          if (clFiles.data) setClHistory(clFiles.data)
        }
      } catch {}
    }
    loadData()
  }, [])

  // ── Resume Generation ─────────────────────────────────
  async function handleGenerateResume(force = false) {
    setError(null)
    setResumeResult(null)
    setResumeDuplicateWarning(null)

    const data = await resumeJob.start('/api/generate-pdf', {
      jd_text: jdText || undefined,
      report_id: selectedReportId || undefined,
      force,
      model_tier: modelTier,
    })

    // Direct response (cached already_exists) — no job was started
    if (data && data.already_exists) {
      setResumeDuplicateWarning(data)
    }
    // If data is null, a job was started and polling will fire onComplete
  }

  // ── Cover Letter Generation ───────────────────────────
  async function handleGenerateCL(force = false) {
    setError(null)
    setClResult(null)
    setClDuplicateWarning(null)

    const body: any = { force, model_tier: modelTier }
    if (selectedReportId || reportIdParam) body.report_id = selectedReportId || reportIdParam
    else body.jd_text = jdText

    const data = await clJob.start('/api/cover-letter', body)

    if (data && data.already_exists) {
      setClDuplicateWarning(data)
    }
  }

  // ── Generate Both ─────────────────────────────────────
  async function handleGenerateBoth() {
    await Promise.all([handleGenerateResume(), handleGenerateCL()])
  }

  // ── DOCX Builders ─────────────────────────────────────
  async function buildResumeDocx(c: any, downloadName: string) {
    const { Document, Packer, Paragraph, TextRun, BorderStyle, convertInchesToTwip, TabStopType, TabStopPosition } = await import('docx')
    const children: InstanceType<typeof Paragraph>[] = []
    const F = 'Garamond'
    const allText = [c.summary || '', ...(c.experience || []).flatMap((j: any) => [j.company, j.role, j.period, ...(j.bullets || [])]), ...(c.github_projects || []).map((p: any) => `${p.name} ${p.description}`), ...(c.education || []).map((e: any) => `${e.degree} ${e.institution}`), ...(c.certifications || []).map((cert: any) => `${cert.name} ${cert.issuer} ${cert.dates}`), ...(c.skills || []).map((s: any) => `${s.category}: ${(s.items || []).join(', ')}`)].join('\n')
    const totalChars = allText.length
    const sectionCount = [c.summary, (c.experience || []).length, (c.education || []).length, (c.certifications || []).length, (c.skills || []).length, (c.github_projects || []).length].filter(Boolean).length
    const structuralLines = 3 + sectionCount * 2 + (c.experience || []).length * 2
    const tiers = [
      { cpl: 85, avail: 54, name: 26, body: 21, small: 20, contact: 19, space: 120, line: 250 },
      { cpl: 90, avail: 58, name: 24, body: 20, small: 19, contact: 18, space: 100, line: 240 },
      { cpl: 95, avail: 62, name: 23, body: 19, small: 18, contact: 17, space: 90, line: 232 },
      { cpl: 105, avail: 68, name: 22, body: 18, small: 17, contact: 16, space: 80, line: 224 },
    ]
    let tier = tiers[tiers.length - 1]
    for (const t of tiers) { if (Math.ceil(totalChars / t.cpl) + structuralLines <= t.avail) { tier = t; break } }
    const SZ_NAME = tier.name, SZ_BODY = tier.body, SZ_SMALL = tier.small, SZ_CONTACT = tier.contact
    const SPACE_SECTION = tier.space, LINE_SPACING = tier.line
    const sectionBorder = { bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000', space: 1 } }
    children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: c.name || '', font: F, size: SZ_NAME, bold: true })] }))
    const contactParts = [c.email, c.phone, c.linkedin_display, c.github_display, c.location].filter(Boolean)
    if (contactParts.length) {
      children.push(new Paragraph({ spacing: { after: 40 }, children: contactParts.flatMap((part, i) => {
        const runs: InstanceType<typeof TextRun>[] = []
        if (i > 0) runs.push(new TextRun({ text: '  |  ', font: F, size: SZ_CONTACT, color: '999999' }))
        runs.push(new TextRun({ text: part, font: F, size: SZ_CONTACT, color: '333333' }))
        return runs
      }) }))
    }
    function sectionHeader(title: string) {
      return new Paragraph({ spacing: { before: SPACE_SECTION, after: 40 }, border: sectionBorder, children: [new TextRun({ text: title.toUpperCase(), font: F, size: SZ_BODY, bold: true, characterSpacing: 20 })] })
    }
    if (c.summary) { children.push(sectionHeader('Professional Summary')); children.push(new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, children: [new TextRun({ text: c.summary, font: F, size: SZ_BODY })] })) }
    if (c.github_projects?.length) { children.push(sectionHeader('GitHub Projects')); for (const proj of c.github_projects) { children.push(new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, children: [new TextRun({ text: proj.name, font: F, size: SZ_SMALL, bold: true }), new TextRun({ text: ` — ${proj.description}`, font: F, size: SZ_SMALL })] })) } }
    const rightTab = { type: TabStopType.RIGHT, position: convertInchesToTwip(7.2) }
    if (c.experience?.length) { children.push(sectionHeader('Work Experience')); for (const job of c.experience) {
      children.push(new Paragraph({ spacing: { before: 40, after: 0 }, tabStops: [rightTab], children: [new TextRun({ text: job.company, font: F, size: SZ_BODY, bold: true }), new TextRun({ text: '\t', font: F, size: SZ_SMALL }), new TextRun({ text: job.period, font: F, size: SZ_SMALL, color: '444444' })] }))
      children.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: job.role, font: F, size: SZ_BODY, italics: true })] }))
      if (job.location) children.push(new Paragraph({ spacing: { after: 10 }, children: [new TextRun({ text: job.location, font: F, size: SZ_SMALL, color: '444444' })] }))
      for (const bullet of (job.bullets || [])) { children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 0, line: LINE_SPACING }, children: [new TextRun({ text: bullet, font: F, size: SZ_SMALL })] })) }
    }}
    if (c.education?.length) { children.push(sectionHeader('Education')); for (const edu of c.education) {
      children.push(new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, tabStops: [rightTab], children: [new TextRun({ text: edu.degree, font: F, size: SZ_BODY, bold: true }), new TextRun({ text: ` — ${edu.institution}`, font: F, size: SZ_BODY }), ...(edu.year ? [new TextRun({ text: '\t', font: F, size: SZ_SMALL }), new TextRun({ text: edu.year, font: F, size: SZ_SMALL, color: '444444' })] : [])] }))
      if (edu.notes) children.push(new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, children: [new TextRun({ text: edu.notes, font: F, size: SZ_SMALL, color: '444444' })] }))
    }}
    if (c.certifications?.length) { children.push(sectionHeader('Certifications')); for (const cert of c.certifications) {
      children.push(new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, tabStops: [rightTab], children: [new TextRun({ text: cert.issuer || '', font: F, size: SZ_SMALL, bold: true }), new TextRun({ text: `${cert.issuer ? ' — ' : ''}${cert.name}`, font: F, size: SZ_SMALL }), ...(cert.dates ? [new TextRun({ text: '\t', font: F, size: SZ_SMALL }), new TextRun({ text: cert.dates, font: F, size: SZ_SMALL, color: '444444' })] : [])] }))
    }}
    if (c.skills?.length) { children.push(sectionHeader('Skills')); for (const cat of c.skills) {
      children.push(new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, children: [new TextRun({ text: `${cat.category}: `, font: F, size: SZ_SMALL, bold: true }), new TextRun({ text: (cat.items || []).join(' · '), font: F, size: SZ_SMALL })] }))
    }}
    const doc = new Document({ sections: [{ properties: { page: { margin: { top: convertInchesToTwip(0.3), bottom: convertInchesToTwip(0.3), left: convertInchesToTwip(0.4), right: convertInchesToTwip(0.4) } } }, children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = downloadName; a.click(); URL.revokeObjectURL(url)
  }

  async function buildCoverLetterDocx(cl: any, downloadName: string) {
    const { Document, Packer, Paragraph, TextRun } = await import('docx')
    const children: InstanceType<typeof Paragraph>[] = []
    if (cl.header) {
      if (cl.header.candidate_name) children.push(new Paragraph({ children: [new TextRun({ text: cl.header.candidate_name, bold: true, font: 'Garamond', size: 26 })] }))
      const contactLine = [cl.header.candidate_email, cl.header.candidate_phone, cl.header.candidate_location].filter(Boolean).join(' | ')
      if (contactLine) children.push(new Paragraph({ children: [new TextRun({ text: contactLine, font: 'Garamond', size: 20, color: '666666' })] }))
      children.push(new Paragraph({ children: [] }))
      if (cl.header.date) children.push(new Paragraph({ children: [new TextRun({ text: cl.header.date, font: 'Garamond', size: 22 })] }))
      children.push(new Paragraph({ children: [] }))
    }
    children.push(new Paragraph({ children: [new TextRun({ text: cl.greeting || 'Dear Hiring Manager,', font: 'Garamond', size: 22 })] }))
    children.push(new Paragraph({ children: [] }))
    for (const para of (cl.body_paragraphs || [])) { children.push(new Paragraph({ children: [new TextRun({ text: para, font: 'Garamond', size: 22 })] })); children.push(new Paragraph({ children: [] })) }
    children.push(new Paragraph({ children: [new TextRun({ text: cl.closing || 'Best regards,', font: 'Garamond', size: 22 })] }))
    if (cl.signature_name) children.push(new Paragraph({ children: [new TextRun({ text: cl.signature_name, bold: true, font: 'Garamond', size: 22 })] }))
    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = downloadName; a.click(); URL.revokeObjectURL(url)
  }

  // ── Download handlers ─────────────────────────────────
  function getJobSlug() {
    const match = selectedReportId ? recentReports.find(r => r.report_id === selectedReportId) : reportIdParam ? recentReports.find(r => r.report_id === reportIdParam) : null
    return match ? `${match.company}-${match.role}`.replace(/\s+/g, '-') : 'General'
  }

  async function handleDownloadResumePdf() {
    if (!resumeResult) return
    let blob: Blob
    if (resumeResult.pdf_base64) { const bytes = Uint8Array.from(atob(resumeResult.pdf_base64), c => c.charCodeAt(0)); blob = new Blob([bytes], { type: 'application/pdf' }) }
    else if (resumeResult.url) { const res = await fetch(resumeResult.url); blob = await res.blob() }
    else return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = resumeResult.filename || 'resume.pdf'; a.click(); URL.revokeObjectURL(url)
  }

  async function handleDownloadResumeDocx() {
    if (!resumeResult?.content) return
    await buildResumeDocx(resumeResult.content, `Resume-${userInitials ? userInitials + '-' : ''}${getJobSlug()}.docx`)
  }

  async function handleDownloadCLPdf() {
    if (!clResult) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    const margin = 60; const pageWidth = doc.internal.pageSize.getWidth() - margin * 2; let y = margin
    doc.setFont('times', 'normal')
    if (clResult.header) {
      if (clResult.header.candidate_name) { doc.setFontSize(14); doc.setFont('times', 'bold'); doc.text(clResult.header.candidate_name, margin, y); y += 18 }
      const contact = [clResult.header.candidate_email, clResult.header.candidate_phone, clResult.header.candidate_location].filter(Boolean).join(' | ')
      if (contact) { doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(100); doc.text(contact, margin, y); y += 20; doc.setTextColor(0) }
      if (clResult.header.date) { doc.setFontSize(11); doc.text(clResult.header.date, margin, y); y += 24 }
    }
    doc.setFontSize(11); doc.setFont('times', 'normal')
    if (clResult.greeting) { doc.text(clResult.greeting, margin, y); y += 20 }
    for (const para of (clResult.body_paragraphs || [])) { const lines = doc.splitTextToSize(para, pageWidth); if (y + lines.length * 15 > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin } doc.text(lines, margin, y); y += lines.length * 15 + 10 }
    if (clResult.closing) { doc.text(clResult.closing, margin, y); y += 18 }
    if (clResult.signature_name) { doc.setFont('times', 'bold'); doc.text(clResult.signature_name, margin, y) }
    doc.save(`Cover-Letter-${userInitials ? userInitials + '-' : ''}${getJobSlug()}.pdf`)
  }

  async function handleDownloadCLDocx() {
    if (!clResult) return
    await buildCoverLetterDocx(clResult, `Cover-Letter-${userInitials ? userInitials + '-' : ''}${getJobSlug()}.docx`)
  }

  async function handleCopyCL() {
    if (!clResult) return
    const fullText = [
      ...(clResult.header ? [clResult.header.candidate_name, [clResult.header.candidate_email, clResult.header.candidate_phone, clResult.header.candidate_location].filter(Boolean).join(' | '), '', clResult.header.date, ''].filter(v => v !== undefined) : []),
      clResult.greeting || 'Dear Hiring Manager,', '', ...(clResult.body_paragraphs || []), '', clResult.closing || 'Best regards,', clResult.signature_name || '',
    ].join('\n\n')
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleFetchUrl() {
    if (!jdUrl.trim()) return
    setFetchingUrl(true)
    setError(null)
    try {
      const res = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jdUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setJdText(data.text)
      setJdUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job description from URL')
    } finally {
      setFetchingUrl(false)
    }
  }

  const selectedMatch = reportIdParam ? recentReports.find(r => r.report_id === reportIdParam) : null
  const q = searchQuery.toLowerCase()
  const filteredReports = q ? recentReports.filter(r => r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)) : recentReports

  const isResume = activeTab === 'resume'
  const result = isResume ? resumeResult : clResult
  const duplicateWarning = isResume ? resumeDuplicateWarning : clDuplicateWarning

  return (
    <div className="mx-auto max-w-4xl space-y-6 min-w-0 overflow-x-hidden">
      {reportIdParam && (
        <Link href={`/reports/${reportIdParam}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Back to Report</Button>
        </Link>
      )}

      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground">Generate tailored resumes and cover letters for specific jobs</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'resume' as const, label: 'Resume', icon: FileDown, credits: 3 },
          { key: 'cover-letter' as const, label: 'Cover Letter', icon: Mail, credits: 3 },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setError(null) }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {(tab.key === 'resume' ? resumeLoading : clLoading) ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <tab.icon className="size-4" />
            )}
            {tab.label}
            <span className="text-xs text-muted-foreground">({tab.credits} credits)</span>
          </button>
        ))}
      </div>

      {/* Job Selector — shared between both tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {reportIdParam && selectedMatch && (
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{selectedMatch.company}</span>
                  <span className="text-muted-foreground truncate">{selectedMatch.role}</span>
                </div>
                <Badge variant={selectedMatch.score >= 4 ? 'default' : 'secondary'} className="text-xs shrink-0 ml-2">
                  {selectedMatch.score.toFixed(1)}/5
                </Badge>
              </div>
            )}

            {!reportIdParam && recentReports.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select from evaluated jobs</label>
                {recentReports.length > 3 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Search by company or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
                  </div>
                )}
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {filteredReports.map((r) => (
                    <button key={r.id} onClick={() => { setSelectedReportId(selectedReportId === r.report_id ? null : r.report_id); if (selectedReportId !== r.report_id) setJdText('') }}
                      className={cn('flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm transition-colors', selectedReportId === r.report_id ? 'border-primary bg-primary/5' : 'hover:bg-muted')}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.company}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.role}</p>
                      </div>
                      <Badge variant={r.score >= 4 ? 'default' : 'secondary'} className="text-xs shrink-0">{r.score.toFixed(1)}/5</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!reportIdParam && !selectedReportId && (
              <>
                {recentReports.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or paste a new JD</span></div>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Paste a job URL (Greenhouse, Lever, Workday, etc.)"
                      value={jdUrl}
                      onChange={(e) => setJdUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleFetchUrl() }}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={handleFetchUrl} disabled={fetchingUrl || !jdUrl.trim()}>
                    {fetchingUrl ? <Loader2 className="size-4 animate-spin" /> : 'Fetch'}
                  </Button>
                </div>
                <FileUpload onTextExtracted={(text) => setJdText(text)} label="Upload job description" description="PDF, DOCX, or TXT file" />
                <Textarea placeholder="Paste the job description here..." value={jdText} onChange={(e) => setJdText(e.target.value)} rows={6} className="font-mono text-sm max-h-[40vh] overflow-y-auto" />
              </>
            )}

            {/* Model tier selector */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {MODEL_TIERS.map(t => {
                const credits = isResume ? t.pdfCredits : t.clCredits
                return (
                  <button
                    key={t.id}
                    onClick={() => setModelTier(t.id)}
                    className={cn(
                      'relative flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      modelTier === t.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.id === 'balanced' && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-1.5 py-0 text-[9px] font-bold text-white leading-tight whitespace-nowrap">
                        BEST VALUE
                      </span>
                    )}
                    {t.label}
                    <span className="ml-1 text-muted-foreground">({credits} cr)</span>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground truncate">
                {MODEL_TIERS.find(t => t.id === modelTier)?.sublabel}{isResume ? ' — download as PDF or DOCX' : ''}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <CreditConfirmButton
                  credits={MODEL_TIERS.find(t => t.id === modelTier)!.pdfCredits + MODEL_TIERS.find(t => t.id === modelTier)!.clCredits}
                  label="Both"
                  loadingLabel="Generating..."
                  disabled={resumeLoading || clLoading || (!selectedReportId && !reportIdParam && !jdText.trim())}
                  onConfirm={handleGenerateBoth}
                  icon={<FileDown className="size-4" />}
                  variant="outline"
                />
                <CreditConfirmButton
                  credits={isResume ? MODEL_TIERS.find(t => t.id === modelTier)!.pdfCredits : MODEL_TIERS.find(t => t.id === modelTier)!.clCredits}
                  label={isResume ? 'Resume' : 'Cover Letter'}
                  loadingLabel="Generating..."
                  disabled={(isResume ? resumeLoading : clLoading) || (!selectedReportId && !reportIdParam && !jdText.trim())}
                  onConfirm={isResume ? () => handleGenerateResume() : () => handleGenerateCL()}
                  icon={isResume ? <FileDown className="size-4" /> : <Mail className="size-4" />}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-sm text-destructive">{error}</p></CardContent>
        </Card>
      )}

      {/* Duplicate warning */}
      {duplicateWarning && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                A {isResume ? 'resume' : 'cover letter'} was already generated for this job on {new Date(duplicateWarning.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => isResume ? handleGenerateResume(true) : handleGenerateCL(true)}>Regenerate Anyway</Button>
                <Button size="sm" variant="ghost" onClick={() => isResume ? setResumeDuplicateWarning(null) : setClDuplicateWarning(null)}>Dismiss</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Resume Result ────────────────────────────── */}
      {isResume && resumeResult && (
        <>
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  <p className="font-medium text-green-900 dark:text-green-100">Resume generated</p>
                  {resumeResult.keyword_coverage_pct && <p className="text-sm text-green-700 dark:text-green-300">{resumeResult.keyword_coverage_pct}% keyword coverage</p>}
                  {resumeResult.keywords && resumeResult.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">{resumeResult.keywords.slice(0, 15).map((kw, i) => <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>)}</div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {resumeResult.url && <a href={resumeResult.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'sm', variant: 'default' }), 'md:hidden inline-flex items-center gap-1.5')}><Eye className="size-4" />View Resume</a>}
                    {resumeResult.url && <a href={resumeResult.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'sm' }), 'hidden md:inline-flex items-center gap-1.5')}><Eye className="size-4" />Preview</a>}
                    {(resumeResult.url || resumeResult.pdf_base64) && <Button variant="outline" size="sm" onClick={handleDownloadResumePdf}><FileDown className="size-4" />PDF</Button>}
                    {resumeResult.content && <Button variant="outline" size="sm" onClick={handleDownloadResumeDocx}><Download className="size-4" />DOCX</Button>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {(resumeResult.previewUrl || resumeResult.url) && (
            <Card className="hidden md:block"><CardContent className="pt-6"><iframe src={`${resumeResult.previewUrl || resumeResult.url}#navpanes=0&zoom=100`} className="w-full rounded-md border" style={{ height: '80vh' }} title="Resume Preview" /></CardContent></Card>
          )}
        </>
      )}

      {/* ── Cover Letter Result ──────────────────────── */}
      {!isResume && clResult && (
        <>
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Cover letter generated</p>
                  {clResult.word_count && <p className="text-sm text-green-700 dark:text-green-300">{clResult.word_count} words</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyCL}>{copied ? <><Check className="size-4" />Copied</> : <><Copy className="size-4" />Copy</>}</Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCLPdf}><Download className="size-4" />PDF</Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCLDocx}><Download className="size-4" />DOCX</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 font-serif border rounded-lg p-6 bg-white dark:bg-zinc-950">
                {clResult.header && (
                  <div className="space-y-1 pb-4 border-b mb-4">
                    {clResult.header.candidate_name && <p className="font-bold text-base">{clResult.header.candidate_name}</p>}
                    <p className="text-xs text-muted-foreground">{[clResult.header.candidate_email, clResult.header.candidate_phone, clResult.header.candidate_location].filter(Boolean).join(' | ')}</p>
                    {clResult.header.date && <p className="text-sm mt-3">{clResult.header.date}</p>}
                  </div>
                )}
                {clResult.greeting && <p className="font-medium not-italic">{clResult.greeting}</p>}
                {(clResult.body_paragraphs || []).map((para, i) => <p key={i} className="text-sm leading-relaxed">{para}</p>)}
                {clResult.closing && <p className="font-medium">{clResult.closing}</p>}
                {clResult.signature_name && <p className="font-medium">{clResult.signature_name}</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── History ──────────────────────────────────── */}
      {isResume && resumeHistory.filter(h => h.storage_path?.includes('/')).length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base text-muted-foreground">Previously Generated Resumes</CardTitle>
            <div className="flex items-center gap-2">
              {selectedResumeHistory.size > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                  if (!window.confirm(`Remove ${selectedResumeHistory.size} selected item(s)?`)) return
                  const valid = resumeHistory.filter(h => h.storage_path?.includes('/'))
                  const toDelete = valid.filter((_, idx) => selectedResumeHistory.has(idx))
                  try {
                    const { createClient } = await import('@/lib/supabase/client')
                    const supabase = createClient()
                    const paths = toDelete.map(h => h.storage_path).filter(Boolean)
                    if (paths.length) { await supabase.storage.from('generated-files').remove(paths); await supabase.storage.from('generated-files').remove(paths.map(p => p.replace(/\.pdf$/, '.json'))) }
                    for (const h of toDelete) await (supabase as any).from('generated_files').delete().eq('storage_path', h.storage_path)
                  } catch {}
                  const deleteSet = new Set(toDelete.map(h => h.storage_path))
                  setResumeHistory(prev => prev.filter(h => !deleteSet.has(h.storage_path)))
                  setSelectedResumeHistory(new Set())
                }}>Remove ({selectedResumeHistory.size})</Button>
              )}
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded" checked={selectedResumeHistory.size > 0 && selectedResumeHistory.size === resumeHistory.filter(h => h.storage_path?.includes('/')).length} onChange={(e) => setSelectedResumeHistory(e.target.checked ? new Set(resumeHistory.filter(h => h.storage_path?.includes('/')).map((_, i) => i)) : new Set())} />
                Select all
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resumeHistory.filter(h => h.storage_path?.includes('/')).map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <input type="checkbox" className="rounded mr-2 shrink-0" checked={selectedResumeHistory.has(i)} onChange={(e) => { const next = new Set(selectedResumeHistory); e.target.checked ? next.add(i) : next.delete(i); setSelectedResumeHistory(next) }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{h.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Button variant="outline" size="sm" onClick={async () => { const { createClient } = await import('@/lib/supabase/client'); const supabase = createClient(); const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path); if (data?.publicUrl) { const res = await fetch(data.publicUrl); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = h.file_name || 'resume.pdf'; a.click(); URL.revokeObjectURL(url) } }}><FileDown className="size-4" />PDF</Button>
                    <Button variant="outline" size="sm" onClick={async () => { const { createClient } = await import('@/lib/supabase/client'); const supabase = createClient(); const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path.replace(/\.pdf$/, '.json')); if (data?.publicUrl) { try { const res = await fetch(data.publicUrl); if (!res.ok) return; const content = await res.json(); await buildResumeDocx(content, (h.file_name || 'resume').replace(/\.pdf$/, '.docx')) } catch {} } }}><Download className="size-4" />DOCX</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isResume && clHistory.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base text-muted-foreground">Previously Generated Cover Letters</CardTitle>
            <div className="flex items-center gap-2">
              {selectedClHistory.size > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Remove ${selectedClHistory.size} selected?`)) { setClHistory(prev => prev.filter((_, idx) => !selectedClHistory.has(idx))); setSelectedClHistory(new Set()) } }}>Remove ({selectedClHistory.size})</Button>
              )}
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded" checked={selectedClHistory.size > 0 && selectedClHistory.size === clHistory.length} onChange={(e) => setSelectedClHistory(e.target.checked ? new Set(clHistory.map((_, i) => i)) : new Set())} />
                Select all
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <input type="checkbox" className="rounded mr-2 shrink-0" checked={selectedClHistory.has(i)} onChange={(e) => { const next = new Set(selectedClHistory); e.target.checked ? next.add(i) : next.delete(i); setSelectedClHistory(next) }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{h.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {h.storage_path ? (
                      <>
                        <Button variant="outline" size="sm" onClick={async () => { const { createClient } = await import('@/lib/supabase/client'); const supabase = createClient(); const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path!); if (data?.publicUrl) { try { const res = await fetch(data.publicUrl); if (!res.ok) return; const cl = await res.json(); const { jsPDF } = await import('jspdf'); const pdf = new jsPDF({ unit: 'pt', format: 'letter' }); const m = 60; const pw = pdf.internal.pageSize.getWidth() - m * 2; let y = m; pdf.setFont('times', 'normal'); if (cl.header?.candidate_name) { pdf.setFontSize(14); pdf.setFont('times', 'bold'); pdf.text(cl.header.candidate_name, m, y); y += 18 } const cnt = [cl.header?.candidate_email, cl.header?.candidate_phone, cl.header?.candidate_location].filter(Boolean).join(' | '); if (cnt) { pdf.setFontSize(9); pdf.setFont('times', 'normal'); pdf.setTextColor(100); pdf.text(cnt, m, y); y += 20; pdf.setTextColor(0) } if (cl.header?.date) { pdf.setFontSize(11); pdf.text(cl.header.date, m, y); y += 24 } pdf.setFontSize(11); pdf.setFont('times', 'normal'); if (cl.greeting) { pdf.text(cl.greeting, m, y); y += 20 } for (const para of (cl.body_paragraphs || [])) { const lines = pdf.splitTextToSize(para, pw); if (y + lines.length * 15 > pdf.internal.pageSize.getHeight() - m) { pdf.addPage(); y = m } pdf.text(lines, m, y); y += lines.length * 15 + 10 } if (cl.closing) { pdf.text(cl.closing, m, y); y += 18 } if (cl.signature_name) { pdf.setFont('times', 'bold'); pdf.text(cl.signature_name, m, y) } pdf.save((h.file_name || 'cover-letter') + '.pdf') } catch {} } }}><FileDown className="size-4" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={async () => { const { createClient } = await import('@/lib/supabase/client'); const supabase = createClient(); const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path!); if (data?.publicUrl) { try { const res = await fetch(data.publicUrl); if (!res.ok) return; const cl = await res.json(); await buildCoverLetterDocx(cl, (h.file_name || 'cover-letter') + '.docx') } catch {} } }}><Download className="size-4" />DOCX</Button>
                      </>
                    ) : h.report_id ? (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedReportId(h.report_id!); setActiveTab('cover-letter') }}><Mail className="size-4" />Regenerate</Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsContent />
    </Suspense>
  )
}
