'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, FileDown, ExternalLink, CheckCircle, Search, Download, Eye, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { FileUpload } from '@/components/ui/file-upload'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'

interface Report {
  id: string
  report_id: string
  company: string
  role: string
  score: number
  created_at: string
}

function ResumeContent() {
  const searchParams = useSearchParams()
  const reportIdParam = searchParams.get('report_id')

  const [jdText, setJdText] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportIdParam)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ url?: string; pdf_base64?: string; filename?: string; keywords?: string[]; keyword_coverage_pct?: number; content?: any } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userInitials, setUserInitials] = useState('')
  const [history, setHistory] = useState<Array<{ storage_path: string; file_name: string; created_at: string; report_id?: string }>>([])


  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/applications?limit=20')
        if (res.ok) {
          const data = await res.json()
          const items = Array.isArray(data) ? data : data.items || []
          const withReports = items.filter((a: any) => a.report_id)
          setRecentReports(withReports)
        }
      } catch {}
      // Load user initials + generated files history
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await (supabase as any).from('profiles').select('full_name').eq('id', user.id).single()
          if (data?.full_name) {
            setUserInitials(data.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase())
          }
          // Load resume generation history from cloud
          const { data: files } = await (supabase as any)
            .from('generated_files')
            .select('storage_path, file_name, created_at, report_id, keyword_coverage')
            .eq('user_id', user.id)
            .eq('file_type', 'resume')
            .order('created_at', { ascending: false })
            .limit(20)
          if (files) setHistory(files)
        }
      } catch {}
    }
    loadReports()
  }, [])

  const [duplicateWarning, setDuplicateWarning] = useState<{ file_name: string; created_at: string; storage_path?: string } | null>(null)

  async function handleGenerate(force = false) {
    setLoading(true)
    setError(null)
    setResult(null)
    setDuplicateWarning(null)

    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdText || undefined,
          report_id: selectedReportId || undefined,
          force,
        }),
      })

      // Handle PDF binary response (storage failed)
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.headers.get('content-disposition')?.split('filename="')[1]?.replace('"', '') || 'resume.pdf'
        a.click()
        URL.revokeObjectURL(url)
        setResult({ filename: 'resume.pdf' })
        return
      }

      const data = await res.json()
      if (data.already_exists) {
        setDuplicateWarning(data)
        setLoading(false)
        return
      }
      if (!res.ok) { setError(data.error || 'Failed to generate'); return }

      // If storage upload failed, API returns pdf_base64 instead of url — create a blob URL
      if (!data.url && data.pdf_base64) {
        const bytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'application/pdf' })
        data.url = URL.createObjectURL(blob)
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadDocx() {
    if (!result?.content) return
    const c = result.content
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    const children: InstanceType<typeof Paragraph>[] = []

    // Name + contact
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: c.name || '', font: 'Garamond', size: 28, bold: true })] }))
    const contact = [c.email, c.location].filter(Boolean).join(' | ')
    if (contact) children.push(new Paragraph({ children: [new TextRun({ text: contact, font: 'Garamond', size: 20, color: '666666' })] }))
    children.push(new Paragraph({ children: [] }))

    // Summary
    if (c.summary) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'PROFESSIONAL SUMMARY', font: 'Garamond', size: 22, bold: true })] }))
      children.push(new Paragraph({ children: [new TextRun({ text: c.summary, font: 'Garamond', size: 22 })] }))
      children.push(new Paragraph({ children: [] }))
    }

    // GitHub Projects
    if (c.github_projects?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'GITHUB PROJECTS', font: 'Garamond', size: 22, bold: true })] }))
      for (const proj of c.github_projects) {
        children.push(new Paragraph({ children: [
          new TextRun({ text: proj.name, font: 'Garamond', size: 22, bold: true }),
          new TextRun({ text: ` — ${proj.description}`, font: 'Garamond', size: 22 }),
        ]}))
      }
      children.push(new Paragraph({ children: [] }))
    }

    // Experience
    if (c.experience?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'EXPERIENCE', font: 'Garamond', size: 22, bold: true })] }))
      for (const job of c.experience) {
        children.push(new Paragraph({ children: [
          new TextRun({ text: `${job.role}`, font: 'Garamond', size: 22, bold: true }),
          new TextRun({ text: ` — ${job.company}`, font: 'Garamond', size: 22 }),
        ]}))
        children.push(new Paragraph({ children: [new TextRun({ text: `${job.period}${job.location ? ' | ' + job.location : ''}`, font: 'Garamond', size: 20, italics: true, color: '666666' })] }))
        for (const bullet of (job.bullets || [])) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: bullet, font: 'Garamond', size: 22 })] }))
        }
        children.push(new Paragraph({ children: [] }))
      }
    }

    // Education
    if (c.education?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'EDUCATION', font: 'Garamond', size: 22, bold: true })] }))
      for (const edu of c.education) {
        children.push(new Paragraph({ children: [
          new TextRun({ text: edu.degree, font: 'Garamond', size: 22, bold: true }),
          new TextRun({ text: ` — ${edu.institution} (${edu.year})`, font: 'Garamond', size: 22 }),
        ]}))
      }
      children.push(new Paragraph({ children: [] }))
    }

    // Certifications
    if (c.certifications?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'CERTIFICATIONS', font: 'Garamond', size: 22, bold: true })] }))
      for (const cert of c.certifications) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `${cert.name} — ${cert.issuer} (${cert.dates})`, font: 'Garamond', size: 22 })] }))
      }
      children.push(new Paragraph({ children: [] }))
    }

    // Skills
    if (c.skills?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'SKILLS', font: 'Garamond', size: 22, bold: true })] }))
      for (const cat of c.skills) {
        children.push(new Paragraph({ children: [
          new TextRun({ text: `${cat.category}: `, font: 'Garamond', size: 22, bold: true }),
          new TextRun({ text: (cat.items || []).join(', '), font: 'Garamond', size: 22 }),
        ]}))
      }
    }

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const match = selectedReportId ? recentReports.find(r => r.report_id === selectedReportId) : selectedMatch
    const jobSlug = match ? `${match.company}-${match.role}` : 'General'
    a.download = `Resume-${userInitials ? userInitials + '-' : ''}${jobSlug.replace(/\s+/g, '-')}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPdf() {
    if (!result) return
    let blob: Blob
    if (result.pdf_base64) {
      const bytes = Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0))
      blob = new Blob([bytes], { type: 'application/pdf' })
    } else if (result.url) {
      const res = await fetch(result.url)
      blob = await res.blob()
    } else {
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename || 'resume.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedMatch = reportIdParam ? recentReports.find(r => r.report_id === reportIdParam) : null
  const q = searchQuery.toLowerCase()
  const filteredReports = q ? recentReports.filter(r =>
    r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
  ) : recentReports

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {reportIdParam && (
        <Link href={`/reports/${reportIdParam}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Back to Report</Button>
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-bold">Resume</h1>
        <p className="text-muted-foreground">Generate an ATS-optimized, tailored resume for a specific job description</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Tailored Resume</CardTitle>
          <CardDescription>
            {reportIdParam
              ? 'Generate a resume tailored to this evaluated job.'
              : 'Select an evaluated job or paste a new job description. Leave blank for a general version.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Coming from report page — show selected job only */}
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

            {/* Normal flow — show selector */}
            {!reportIdParam && recentReports.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select from evaluated jobs</label>
                {recentReports.length > 3 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by company or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                )}
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {filteredReports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedReportId(selectedReportId === r.report_id ? null : r.report_id)
                        if (selectedReportId !== r.report_id) setJdText('')
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors',
                        selectedReportId === r.report_id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{r.company}</span>
                        <span className="text-muted-foreground truncate">{r.role}</span>
                      </div>
                      <Badge variant={r.score >= 4 ? 'default' : 'secondary'} className="text-xs shrink-0 ml-2">
                        {r.score.toFixed(1)}/5
                      </Badge>
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
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or paste a new JD</span>
                    </div>
                  </div>
                )}
                <FileUpload
                  onTextExtracted={(text) => setJdText(text)}
                  label="Upload job description"
                  description="PDF, DOCX, or TXT file"
                />
                <Textarea
                  placeholder="Paste the job description here (optional but strongly recommended)..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Costs 3 credits — download as PDF or DOCX</p>
              <CreditConfirmButton
                credits={3}
                label="Generate"
                loadingLabel="Generating..."
                disabled={loading}
                onConfirm={handleGenerate}
                icon={<FileDown className="size-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-sm text-destructive">{error}</p></CardContent>
        </Card>
      )}

      {duplicateWarning && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                A resume was already generated for this job on {new Date(duplicateWarning.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {duplicateWarning.file_name} — You can download it below in history, or regenerate to use credits for a fresh version.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleGenerate(true)}>
                  Regenerate Anyway
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDuplicateWarning(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  <p className="font-medium text-green-900 dark:text-green-100">PDF generated successfully</p>

                  {result.keyword_coverage_pct && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {result.keyword_coverage_pct}% keyword coverage
                    </p>
                  )}

                  {result.keywords && result.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.keywords.slice(0, 15).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {result.url && (
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center gap-1.5')}>
                        <Eye className="size-4" />Preview
                      </a>
                    )}
                    {(result.url || result.pdf_base64) && (
                      <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                        <FileDown className="size-4" />Download PDF
                      </Button>
                    )}
                    {result.content && (
                      <Button variant="outline" size="sm" onClick={handleDownloadDocx}>
                        <Download className="size-4" />Download DOCX
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Preview */}
          {result.url && (
            <Card>
              <CardContent className="pt-6">
                <iframe
                  src={result.url}
                  className="w-full rounded-md border"
                  style={{ height: '80vh' }}
                  title="Resume Preview"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Generation history */}
      {history.filter(h => h.storage_path && h.storage_path.includes('/')).length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Previously Generated Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.filter(h => h.storage_path && h.storage_path.includes('/')).map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{h.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Button variant="outline" size="sm" onClick={async () => {
                      const { createClient } = await import('@/lib/supabase/client')
                      const supabase = createClient()
                      const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path)
                      if (data?.publicUrl) {
                        const res = await fetch(data.publicUrl)
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = h.file_name || 'resume.pdf'
                        a.click()
                        URL.revokeObjectURL(url)
                      }
                    }}>
                      <FileDown className="size-4" />PDF
                    </Button>
                    {h.report_id && (
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedReportId(h.report_id!)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}>
                        <Download className="size-4" />Regenerate
                      </Button>
                    )}
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

export default function ResumePage() {
  return (
    <Suspense>
      <ResumeContent />
    </Suspense>
  )
}
