'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, FileDown, ExternalLink, CheckCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  const [result, setResult] = useState<{ url?: string; filename?: string; keywords?: string[]; keyword_coverage_pct?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [searchQuery, setSearchQuery] = useState('')

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
    }
    loadReports()
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdText || undefined,
          report_id: selectedReportId || undefined,
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
      if (!res.ok) { setError(data.error || 'Failed to generate'); return }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  const selectedMatch = reportIdParam ? recentReports.find(r => r.report_id === reportIdParam) : null
  const q = searchQuery.toLowerCase()
  const filteredReports = q ? recentReports.filter(r =>
    r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
  ) : recentReports

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resume PDF</h1>
        <p className="text-muted-foreground">Generate an ATS-optimized, 1-page PDF tailored to a specific job description</p>
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
              <p className="text-xs text-muted-foreground">Costs 3 credits — Garamond, auto font-sized to fill exactly 1 page</p>
              <CreditConfirmButton
                credits={3}
                label="Generate PDF"
                loadingLabel="Generating PDF..."
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

      {result && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-3">
                <p className="font-medium text-green-900 dark:text-green-100">PDF generated successfully</p>

                {result.keyword_coverage_pct && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {result.keyword_coverage_pct}% keyword coverage
                    </p>
                  </div>
                )}

                {result.keywords && result.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.keywords.slice(0, 15).map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                )}

                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center gap-1.5')}
                  >
                    <ExternalLink className="size-4" />
                    Download PDF
                  </a>
                )}
              </div>
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
