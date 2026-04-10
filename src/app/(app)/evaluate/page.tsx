'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

const BLOCK_MAP: { key: string; title: string }[] = [
  { key: 'block_a', title: 'A) Role Summary' },
  { key: 'block_b', title: 'B) CV Match' },
  { key: 'block_c', title: 'C) Level & Strategy' },
  { key: 'block_d', title: 'D) Comp & Demand' },
  { key: 'block_e', title: 'E) Customization Plan' },
  { key: 'block_f', title: 'F) Interview Plan' },
  { key: 'block_g', title: 'G) Draft Answers' },
]

const JOB_STORAGE_KEY = 'evaluate:active-job-id'
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 90 // 3 minutes of polling max

export default function EvaluatePage() {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [blocks, setBlocks] = useState<EvaluationBlock[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [archetype, setArchetype] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineDone, setPipelineDone] = useState<{ pdf?: string; coverLetter?: boolean } | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAttemptsRef = useRef(0)

  function applyResult(result: Record<string, unknown>, statusScore: number | null, statusArchetype: string | null, statusReportId: string | null) {
    const renderedBlocks: EvaluationBlock[] = []
    for (const b of BLOCK_MAP) {
      if (result[b.key]) {
        renderedBlocks.push({ key: b.key, title: b.title, content: result[b.key] })
      }
    }
    setBlocks(renderedBlocks)
    setScore(statusScore ?? (typeof result.score === 'number' ? result.score : 0))
    setArchetype(statusArchetype ?? ((result.archetype as string) || null))
    setReportId(statusReportId)
  }

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    pollAttemptsRef.current = 0
  }, [])

  const pollJob = useCallback(async (jobId: string) => {
    try {
      pollAttemptsRef.current += 1
      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        setError('Evaluation timed out. Please try again.')
        setLoading(false)
        localStorage.removeItem(JOB_STORAGE_KEY)
        stopPolling()
        return
      }

      const res = await fetch(`/api/evaluate/status?id=${encodeURIComponent(jobId)}`, { cache: 'no-store' })
      if (!res.ok) {
        // 404 means the job was cleaned up or doesn't belong to this user
        if (res.status === 404) {
          localStorage.removeItem(JOB_STORAGE_KEY)
          setLoading(false)
          stopPolling()
          return
        }
        // Transient error — keep polling
        pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
        return
      }

      const data = await res.json()
      if (data.status === 'completed' && data.result) {
        applyResult(data.result, data.score ?? null, data.archetype ?? null, data.report_id ?? null)
        setLoading(false)
        localStorage.removeItem(JOB_STORAGE_KEY)
        stopPolling()
        return
      }
      if (data.status === 'failed') {
        setError(data.error || 'Evaluation failed')
        setLoading(false)
        localStorage.removeItem(JOB_STORAGE_KEY)
        stopPolling()
        return
      }

      // pending or running — keep polling
      pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
    } catch {
      // Network hiccup — back off and try again
      pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
    }
  }, [stopPolling])

  // On mount, resume any in-flight job (survives page reload / tab suspension / phone sleep)
  useEffect(() => {
    const existing = typeof window !== 'undefined' ? localStorage.getItem(JOB_STORAGE_KEY) : null
    if (existing) {
      setLoading(true)
      pollJob(existing)
    }
    return () => stopPolling()
  }, [pollJob, stopPolling])

  // When the tab becomes visible again (user wakes phone, switches back), trigger an immediate poll
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        const existing = localStorage.getItem(JOB_STORAGE_KEY)
        if (existing && loading) {
          stopPolling()
          pollJob(existing)
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loading, pollJob, stopPolling])

  async function handleEvaluate() {
    if (!jdText.trim()) return

    setLoading(true)
    setError(null)
    setBlocks([])
    setScore(null)
    setArchetype(null)
    setReportId(null)
    setPipelineDone(null)

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText }),
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

      const data = await res.json()
      if (!data.job_id) {
        setError('No job id returned')
        setLoading(false)
        return
      }

      localStorage.setItem(JOB_STORAGE_KEY, data.job_id)
      pollAttemptsRef.current = 0
      pollJob(data.job_id)
    } catch (err) {
      // Even if the POST itself fails, we haven't saved a job id — safe to reset
      setError(err instanceof Error ? err.message : 'Failed to start evaluation')
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

  const hasResults = score !== null || blocks.length > 0
  const isActive = loading || hasResults

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluate Job Posting</h1>
        <p className="text-muted-foreground">
          Paste a job description to get a full match report with gap analysis
        </p>
      </div>

      {loading && !hasResults && (
        <Card className="order-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <span className="font-medium">Evaluating job description...</span>
              <span className="text-muted-foreground hidden sm:inline">This can take 20–40 seconds</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={isActive ? 'order-3' : 'order-2'}>
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
              rows={isActive ? 4 : 10}
              className="font-mono text-sm max-h-[40vh] overflow-y-auto md:max-h-none"
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
        <Card className="border-destructive order-1">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {hasResults && (
        <Card className="order-2">
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
                      <Badge className="bg-green-600 cursor-pointer"><FileDown className="size-3 mr-1" />Resume ready</Badge>
                    </a>
                  )}
                  {pipelineDone.pdf === 'downloaded' && (
                    <Badge className="bg-green-600"><FileDown className="size-3 mr-1" />Resume downloaded</Badge>
                  )}
                  {pipelineDone.coverLetter && reportId && (
                    <Link href={`/resume?tab=cover-letter&report_id=${reportId}`}>
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
                  <Button variant="outline" size="sm"><FileDown className="size-4" />Resume</Button>
                </Link>
                <Link href={`/resume?tab=cover-letter&report_id=${reportId}`}>
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
