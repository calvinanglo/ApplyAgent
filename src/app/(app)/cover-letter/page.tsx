'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Copy, Check, Search, Download, ArrowLeft, FileDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { FileUpload } from '@/components/ui/file-upload'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { cn } from '@/lib/utils'

interface AppReport {
  id: string
  report_id: string
  company: string
  role: string
  score: number
}

function CoverLetterContent() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get('report_id')

  const [jdText, setJdText] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportId)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    body_paragraphs: string[]
    greeting?: string
    closing?: string
    word_count?: number
    signature_name?: string
    header?: {
      candidate_name?: string
      candidate_email?: string
      candidate_phone?: string
      candidate_location?: string
      date?: string
      recipient_company?: string
      recipient_role?: string
    }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [recentReports, setRecentReports] = useState<AppReport[]>([])
  const [userInitials, setUserInitials] = useState('')
  const [clHistory, setClHistory] = useState<Array<{ file_name: string; created_at: string; report_id?: string; storage_path?: string }>>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<{ file_name: string; created_at: string } | null>(null)
  const [selectedClHistory, setSelectedClHistory] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/applications?limit=20')
        if (res.ok) {
          const data = await res.json()
          const items = Array.isArray(data) ? data : data.items || []
          setRecentReports(items.filter((a: any) => a.report_id))
        }
      } catch {}
      // Load user initials + cover letter history
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await (supabase as any).from('profiles').select('full_name').eq('id', user.id).single()
          if (data?.full_name) {
            setUserInitials(data.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase())
          }
          const { data: files } = await (supabase as any)
            .from('generated_files')
            .select('file_name, created_at, report_id, storage_path')
            .eq('user_id', user.id)
            .eq('file_type', 'cover_letter')
            .order('created_at', { ascending: false })
            .limit(20)
          if (files) setClHistory(files)
        }
      } catch {}
    }
    loadReports()
  }, [])

  async function generateFromReport(id: string, force = false) {
    setLoading(true)
    setError(null)
    setResult(null)
    setDuplicateWarning(null)
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: id, force }),
      })
      const data = await res.json()
      if (data.already_exists) {
        setDuplicateWarning(data)
        return
      }
      if (!res.ok) { setError(data.error || 'Failed to generate'); return }
      setResult(data.cover_letter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!jdText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate'); return }
      setResult(data.cover_letter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  const fullText = result
    ? [
        ...(result.header ? [
          result.header.candidate_name,
          [result.header.candidate_email, result.header.candidate_phone, result.header.candidate_location].filter(Boolean).join(' | '),
          '',
          result.header.date,
          '',
        ].filter(v => v !== undefined) : []),
        result.greeting || 'Dear Hiring Manager,',
        '',
        ...(result.body_paragraphs || []),
        '',
        result.closing || 'Best regards,',
        result.signature_name || '',
      ].join('\n\n')
    : ''

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownloadPdf() {
    if (!result) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    const margin = 60
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin

    doc.setFont('times', 'normal')

    // Header
    if (result.header) {
      if (result.header.candidate_name) {
        doc.setFontSize(14)
        doc.setFont('times', 'bold')
        doc.text(result.header.candidate_name, margin, y)
        y += 18
      }
      const contact = [result.header.candidate_email, result.header.candidate_phone, result.header.candidate_location].filter(Boolean).join(' | ')
      if (contact) {
        doc.setFontSize(9)
        doc.setFont('times', 'normal')
        doc.setTextColor(100)
        doc.text(contact, margin, y)
        y += 20
        doc.setTextColor(0)
      }
      if (result.header.date) {
        doc.setFontSize(11)
        doc.text(result.header.date, margin, y)
        y += 24
      }
    }

    // Greeting
    doc.setFontSize(11)
    doc.setFont('times', 'normal')
    if (result.greeting) {
      doc.text(result.greeting, margin, y)
      y += 20
    }

    // Body paragraphs
    for (const para of (result.body_paragraphs || [])) {
      const lines = doc.splitTextToSize(para, pageWidth)
      if (y + lines.length * 15 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(lines, margin, y)
      y += lines.length * 15 + 10
    }

    // Closing
    if (result.closing) {
      doc.text(result.closing, margin, y)
      y += 18
    }
    if (result.signature_name) {
      doc.setFont('times', 'bold')
      doc.text(result.signature_name, margin, y)
    }

    const match = selectedReportId ? recentReports.find(r => r.report_id === selectedReportId) : selectedMatch
    const jobSlug = match ? `${match.company}-${match.role}` : (result.header?.recipient_company || 'General')
    doc.save(`Cover-Letter-${userInitials ? userInitials + '-' : ''}${jobSlug.replace(/\s+/g, '-')}.pdf`)
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

    for (const para of (cl.body_paragraphs || [])) {
      children.push(new Paragraph({ children: [new TextRun({ text: para, font: 'Garamond', size: 22 })] }))
      children.push(new Paragraph({ children: [] }))
    }

    children.push(new Paragraph({ children: [new TextRun({ text: cl.closing || 'Best regards,', font: 'Garamond', size: 22 })] }))
    if (cl.signature_name) children.push(new Paragraph({ children: [new TextRun({ text: cl.signature_name, bold: true, font: 'Garamond', size: 22 })] }))

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadDocx() {
    if (!result) return
    const match = selectedReportId ? recentReports.find(r => r.report_id === selectedReportId) : selectedMatch
    const jobSlug = match ? `${match.company}-${match.role}` : (result.header?.recipient_company || 'General')
    await buildCoverLetterDocx(result, `Cover-Letter-${userInitials ? userInitials + '-' : ''}${jobSlug.replace(/\s+/g, '-')}.docx`)
  }

  const selectedMatch = reportId ? recentReports.find(r => r.report_id === reportId) : null
  const q = searchQuery.toLowerCase()
  const filteredReports = q ? recentReports.filter(r =>
    r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
  ) : recentReports

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {reportId && (
        <Link href={`/reports/${reportId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Back to Report</Button>
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-bold">Cover Letter</h1>
        <p className="text-muted-foreground">Tailored cover letter matched to the job description.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Coming from report page — show selected job only */}
            {reportId && selectedMatch && (
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
            {!reportId && recentReports.length > 0 && (
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

            {!reportId && !selectedReportId && (
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
                  placeholder="Paste the job description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Costs 5 credits</p>
              <CreditConfirmButton
                credits={5}
                label="Generate"
                loadingLabel="Generating..."
                disabled={loading || (!jdText.trim() && !selectedReportId && !reportId)}
                onConfirm={reportId ? () => generateFromReport(reportId) : selectedReportId ? () => generateFromReport(selectedReportId) : handleGenerate}
                icon={<Mail className="size-4" />}
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
                A cover letter was already generated for this job on {new Date(duplicateWarning.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {duplicateWarning.file_name} — You can regenerate to use credits for a fresh version.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => generateFromReport(selectedReportId!, true)}>
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
          {/* Action buttons */}
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Cover letter generated</p>
                  {result.word_count && <p className="text-sm text-green-700 dark:text-green-300">{result.word_count} words</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <><Check className="size-4" />Copied</> : <><Copy className="size-4" />Copy</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                    <Download className="size-4" />PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadDocx}>
                    <Download className="size-4" />DOCX
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 font-serif border rounded-lg p-6 bg-white dark:bg-zinc-950">
                {result.header && (
                  <div className="space-y-1 pb-4 border-b mb-4">
                    {result.header.candidate_name && <p className="font-bold text-base">{result.header.candidate_name}</p>}
                    <p className="text-xs text-muted-foreground">
                      {[result.header.candidate_email, result.header.candidate_phone, result.header.candidate_location].filter(Boolean).join(' | ')}
                    </p>
                    {result.header.date && <p className="text-sm mt-3">{result.header.date}</p>}
                  </div>
                )}
                {result.greeting && <p className="font-medium not-italic">{result.greeting}</p>}
                {(result.body_paragraphs || []).map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed">{para}</p>
                ))}
                {result.closing && <p className="font-medium">{result.closing}</p>}
                {result.signature_name && <p className="font-medium">{result.signature_name}</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Generation history from cloud */}
      {clHistory.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-muted-foreground">Previously Generated Cover Letters</CardTitle>
            <div className="flex items-center gap-2">
              {selectedClHistory.size > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                  if (window.confirm(`Remove ${selectedClHistory.size} selected item(s) from history?`)) {
                    setClHistory(prev => prev.filter((_, idx) => !selectedClHistory.has(idx)))
                    setSelectedClHistory(new Set())
                  }
                }}>Remove ({selectedClHistory.size})</Button>
              )}
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded" checked={selectedClHistory.size > 0 && selectedClHistory.size === clHistory.length} onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedClHistory(new Set(clHistory.map((_, i) => i)))
                  } else {
                    setSelectedClHistory(new Set())
                  }
                }} />
                Select all
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <input type="checkbox" className="rounded mr-2 shrink-0" checked={selectedClHistory.has(i)} onChange={(e) => {
                    const next = new Set(selectedClHistory)
                    if (e.target.checked) next.add(i); else next.delete(i)
                    setSelectedClHistory(next)
                  }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{h.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {h.storage_path ? (
                      <>
                        <Button variant="outline" size="sm" onClick={async () => {
                          const { createClient } = await import('@/lib/supabase/client')
                          const supabase = createClient()
                          const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path!)
                          if (data?.publicUrl) {
                            try {
                              const res = await fetch(data.publicUrl)
                              if (!res.ok) return
                              const cl = await res.json()
                              const { jsPDF } = await import('jspdf')
                              const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
                              const margin = 60
                              const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
                              let y = margin
                              pdf.setFont('times', 'normal')
                              if (cl.header?.candidate_name) { pdf.setFontSize(14); pdf.setFont('times', 'bold'); pdf.text(cl.header.candidate_name, margin, y); y += 18 }
                              const cnt = [cl.header?.candidate_email, cl.header?.candidate_phone, cl.header?.candidate_location].filter(Boolean).join(' | ')
                              if (cnt) { pdf.setFontSize(9); pdf.setFont('times', 'normal'); pdf.setTextColor(100); pdf.text(cnt, margin, y); y += 20; pdf.setTextColor(0) }
                              if (cl.header?.date) { pdf.setFontSize(11); pdf.text(cl.header.date, margin, y); y += 24 }
                              pdf.setFontSize(11); pdf.setFont('times', 'normal')
                              if (cl.greeting) { pdf.text(cl.greeting, margin, y); y += 20 }
                              for (const para of (cl.body_paragraphs || [])) { const lines = pdf.splitTextToSize(para, pageWidth); if (y + lines.length * 15 > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin } pdf.text(lines, margin, y); y += lines.length * 15 + 10 }
                              if (cl.closing) { pdf.text(cl.closing, margin, y); y += 18 }
                              if (cl.signature_name) { pdf.setFont('times', 'bold'); pdf.text(cl.signature_name, margin, y) }
                              pdf.save((h.file_name || 'cover-letter') + '.pdf')
                            } catch {}
                          }
                        }}>
                          <FileDown className="size-4" />PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={async () => {
                          const { createClient } = await import('@/lib/supabase/client')
                          const supabase = createClient()
                          const { data } = supabase.storage.from('generated-files').getPublicUrl(h.storage_path!)
                          if (data?.publicUrl) {
                            try {
                              const res = await fetch(data.publicUrl)
                              if (!res.ok) return
                              const cl = await res.json()
                              await buildCoverLetterDocx(cl, (h.file_name || 'cover-letter') + '.docx')
                            } catch {}
                          }
                        }}>
                          <Download className="size-4" />DOCX
                        </Button>
                      </>
                    ) : h.report_id ? (
                      <Link href={`/cover-letter?report_id=${h.report_id}`}>
                        <Button variant="outline" size="sm">
                          <Mail className="size-4" />Regenerate
                        </Button>
                      </Link>
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

export default function CoverLetterPage() {
  return (
    <Suspense>
      <CoverLetterContent />
    </Suspense>
  )
}
