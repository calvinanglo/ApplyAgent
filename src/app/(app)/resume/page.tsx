'use client'

import { useState, useEffect } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, FileDown, ExternalLink, CheckCircle } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'

interface Report {
  id: string
  company: string
  role: string
  score: number
  created_at: string
}

export default function ResumePage() {
  const [jdText, setJdText] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ url?: string; filename?: string; keywords?: string[]; keyword_coverage_pct?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<Report[]>([])

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/applications?limit=5')
        if (res.ok) {
          const data = await res.json()
          setRecentReports(data.items || [])
        }
      } catch {}
    }
    loadReports()
  }, [])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
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
            Paste a job description to get a custom resume with injected keywords and reordered bullets.
            Leave blank for a general version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <FileUpload
              onTextExtracted={(text) => setJdText(text)}
              label="Upload job description"
              description="PDF, DOCX, or TXT file"
            />
            <Textarea
              placeholder="Or paste the job description here (optional but strongly recommended)..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Costs 3 credits — Garamond, auto font-sized to fill exactly 1 page</p>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" />Generating PDF...</>
                ) : (
                  <><FileDown className="size-4" />Generate PDF</>
                )}
              </Button>
            </div>
          </form>
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
