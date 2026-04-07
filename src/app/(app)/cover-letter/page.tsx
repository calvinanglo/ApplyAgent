'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Copy, Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  const [result, setResult] = useState<{ body_paragraphs: string[]; greeting?: string; closing?: string; word_count?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [recentReports, setRecentReports] = useState<AppReport[]>([])
  const [searchQuery, setSearchQuery] = useState('')

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
    }
    loadReports()
  }, [])

  async function generateFromReport(id: string) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate'); return }
      setResult(data.cover_letter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
      setAutoGenerating(false)
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
    ? [result.greeting || 'Dear Hiring Manager,', '', ...(result.body_paragraphs || []), '', result.closing || 'Best regards,'].join('\n\n')
    : ''

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedMatch = reportId ? recentReports.find(r => r.report_id === reportId) : null
  const q = searchQuery.toLowerCase()
  const filteredReports = q ? recentReports.filter(r =>
    r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
  ) : recentReports

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cover Letter</CardTitle>
                {result.word_count && <CardDescription>{result.word_count} words</CardDescription>}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <><Check className="size-4" />Copied</> : <><Copy className="size-4" />Copy</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-serif">
              {result.greeting && <p className="font-medium not-italic">{result.greeting}</p>}
              {(result.body_paragraphs || []).map((para, i) => (
                <p key={i} className="text-sm leading-relaxed">{para}</p>
              ))}
              {result.closing && <p className="font-medium">{result.closing}</p>}
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
