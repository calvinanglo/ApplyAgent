'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Send, FileDown, Mail, Zap } from 'lucide-react'
import { CreditConfirmButton } from '@/components/ui/credit-confirm'
import { BlockRenderer } from '@/components/evaluation/BlockRenderer'
import { FileUpload } from '@/components/ui/file-upload'
import Link from 'next/link'

interface EvaluationBlock {
  key: string
  title: string
  content: unknown
}

export default function EvaluatePage() {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [blocks, setBlocks] = useState<EvaluationBlock[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [archetype, setArchetype] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamText, setStreamText] = useState('')
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineDone, setPipelineDone] = useState<{ pdf?: string; coverLetter?: boolean } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleEvaluate() {
    if (!jdText.trim()) return

    setLoading(true)
    setError(null)
    setBlocks([])
    setScore(null)
    setArchetype(null)
    setReportId(null)
    setStreamText('')
    setPipelineDone(null)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        try {
          const data = await res.json()
          setError(data.error || `Evaluation failed (${res.status})`)
        } catch {
          setError(`Evaluation failed (${res.status})`)
        }
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) {
        setError('No response stream')
        setLoading(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data)
              if (event.type === 'block') {
                setBlocks(prev => [...prev, event.data])
              } else if (event.type === 'score') {
                setScore(event.data.score)
                setArchetype(event.data.archetype)
              } else if (event.type === 'saved') {
                setReportId(event.data.report_id)
              } else if (event.type === 'error') {
                setError(event.data.message)
              } else if (event.type === 'text') {
                setStreamText(prev => prev + event.data)
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleFullPipeline() {
    if (!reportId) return
    setPipelineLoading(true)
    setPipelineDone(null)

    try {
      // Run cover letter and PDF in parallel
      const [clRes, pdfRes] = await Promise.allSettled([
        fetch('/api/cover-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id: reportId }),
        }),
        fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id: reportId }),
        }),
      ])

      const result: { pdf?: string; coverLetter?: boolean } = {}

      if (pdfRes.status === 'fulfilled' && pdfRes.value.ok) {
        const contentType = pdfRes.value.headers.get('content-type') || ''
        if (contentType.includes('application/pdf')) {
          // Binary PDF response — trigger download
          const blob = await pdfRes.value.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'resume.pdf'
          a.click()
          URL.revokeObjectURL(url)
          result.pdf = 'downloaded'
        } else {
          const data = await pdfRes.value.json()
          if (data.url) {
            result.pdf = data.url
          }
        }
      }

      if (clRes.status === 'fulfilled' && clRes.value.ok) {
        result.coverLetter = true
      }

      setPipelineDone(result)
    } catch {
      // partial failure is ok — show what worked
    } finally {
      setPipelineLoading(false)
    }
  }

  const scoreColor = score !== null
    ? score >= 4.5 ? 'bg-green-600' : score >= 3.5 ? 'bg-yellow-500' : 'bg-red-500'
    : 'bg-primary'

  const isHighScore = score !== null && score >= 4.5

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluate Job Posting</h1>
        <p className="text-muted-foreground">
          Paste a job description to get a full A-F evaluation with match analysis
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <FileUpload
              onTextExtracted={(text) => setJdText(text)}
              label="Upload job description"
              description="PDF, DOCX, or TXT file"
            />
            <Textarea
              placeholder="Or paste the full job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Costs 10 credits (or 1 free use)
              </p>
              <CreditConfirmButton
                credits={10}
                label="Evaluate"
                loadingLabel="Evaluating..."
                disabled={loading || !jdText.trim()}
                onConfirm={handleEvaluate}
                icon={<Send className="size-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {(score !== null || blocks.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Evaluation Results</CardTitle>
                {archetype && (
                  <CardDescription>Archetype: {archetype}</CardDescription>
                )}
              </div>
              {score !== null && (
                <div className={`${scoreColor} text-white rounded-lg px-4 py-2 text-center shrink-0`}>
                  <p className="text-2xl font-bold leading-none">{Number(score).toFixed(1)}</p>
                  <p className="text-xs opacity-80">out of 5</p>
                </div>
              )}
            </div>

            {/* Full pipeline CTA — only shows when score >= 4.5 and report is saved */}
            {isHighScore && reportId && !pipelineDone && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">Strong match — run full pipeline</p>
                  <p className="text-xs text-green-700 dark:text-green-400">Generate tailored resume PDF and cover letter in one click</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleFullPipeline}
                  disabled={pipelineLoading}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                >
                  {pipelineLoading ? (
                    <><Loader2 className="size-4 animate-spin" />Running...</>
                  ) : (
                    <><Zap className="size-4" />Full Pipeline</>
                  )}
                </Button>
              </div>
            )}

            {/* Pipeline done — show results */}
            {pipelineDone && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3 space-y-2">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">Pipeline complete</p>
                <div className="flex flex-wrap gap-2">
                  {pipelineDone.pdf && pipelineDone.pdf !== 'downloaded' && (
                    <a href={pipelineDone.pdf} target="_blank" rel="noopener noreferrer">
                      <Badge className="bg-green-600 cursor-pointer"><FileDown className="size-3 mr-1" />Resume PDF ready</Badge>
                    </a>
                  )}
                  {pipelineDone.pdf === 'downloaded' && (
                    <Badge className="bg-green-600"><FileDown className="size-3 mr-1" />Resume PDF downloaded</Badge>
                  )}
                  {pipelineDone.coverLetter && reportId && (
                    <Link href={`/cover-letter?report_id=${reportId}`}>
                      <Badge variant="outline" className="cursor-pointer"><Mail className="size-3 mr-1" />Cover letter ready — view</Badge>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Score >= 4.5 but no pipeline yet — show individual action links */}
            {isHighScore && reportId && !pipelineDone && !pipelineLoading && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <Link href={`/resume?report_id=${reportId}`}>
                  <Button variant="outline" size="sm"><FileDown className="size-4" />Resume PDF</Button>
                </Link>
                <Link href={`/cover-letter?report_id=${reportId}`}>
                  <Button variant="outline" size="sm"><Mail className="size-4" />Cover Letter</Button>
                </Link>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {blocks.length > 0 ? (
              <Tabs defaultValue={blocks[0]?.key}>
                <TabsList className="flex flex-wrap h-auto">
                  {blocks.map((block) => (
                    <TabsTrigger key={block.key} value={block.key} className="text-xs">
                      {block.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {blocks.map((block) => (
                  <TabsContent key={block.key} value={block.key} className="mt-4">
                    <BlockRenderer blockKey={block.key} content={block.content} />
                  </TabsContent>
                ))}
              </Tabs>
            ) : streamText ? (
              <pre className="whitespace-pre-wrap text-sm">{streamText}</pre>
            ) : (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Processing evaluation...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
