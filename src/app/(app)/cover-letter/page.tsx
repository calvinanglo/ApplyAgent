'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Copy, Check, Zap } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'

function CoverLetterContent() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get('report_id')

  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ body_paragraphs: string[]; greeting?: string; closing?: string; word_count?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [autoGenerating, setAutoGenerating] = useState(false)

  // Auto-generate if coming from a report
  useEffect(() => {
    if (reportId && !result) {
      setAutoGenerating(true)
      generateFromReport(reportId)
    }
  }, [reportId])

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

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cover Letter</h1>
        <p className="text-muted-foreground">Human-sounding, tailored to the job description. No AI tells.</p>
      </div>

      {/* Auto-generating from report */}
      {autoGenerating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Generating from your evaluation report</p>
                <p className="text-sm text-muted-foreground">Using Block B match data to tailor the letter...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual JD input — shown when not coming from a report */}
      {!reportId && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleGenerate} className="space-y-4">
              <FileUpload
                onTextExtracted={(text) => setJdText(text)}
                label="Upload job description"
                description="PDF, DOCX, or TXT file"
              />
              <Textarea
                placeholder="Or paste the job description here..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Costs 5 credits</p>
                <Button type="submit" disabled={loading || !jdText.trim()}>
                  {loading ? <><Loader2 className="size-4 animate-spin" />Generating...</> : <><Mail className="size-4" />Generate</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Regenerate button when coming from report */}
      {reportId && !autoGenerating && (
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">Generated from evaluation report</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateFromReport(reportId)}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            Regenerate
          </Button>
        </div>
      )}

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
