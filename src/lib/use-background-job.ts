'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useBackgroundJob — shared client-side polling for long-running server jobs.
 *
 * Usage:
 *   const { start, loading, error, reset } = useBackgroundJob<ResumeResult>({
 *     storageKey: 'documents:resume-job',
 *     onComplete: (result) => { ... },
 *   })
 *
 *   await start('/api/generate-pdf', { report_id })
 *
 * Survives:
 *  - mobile tab suspension (polls again on visibilitychange → visible)
 *  - page reload (job id is cached in localStorage and resumed on mount)
 *  - transient network failures (retries on next tick)
 */

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 90 // ~3 minutes

interface Options<TResult> {
  storageKey: string
  onComplete: (result: TResult) => void
  onError?: (error: string) => void
}

export function useBackgroundJob<TResult = unknown>(options: Options<TResult>) {
  const { storageKey, onComplete, onError } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    attemptsRef.current = 0
  }, [])

  const clearStoredJob = useCallback(() => {
    try { localStorage.removeItem(storageKey) } catch {}
  }, [storageKey])

  const fail = useCallback((message: string) => {
    setError(message)
    setLoading(false)
    clearStoredJob()
    stopPolling()
    onError?.(message)
  }, [clearStoredJob, stopPolling, onError])

  const pollJob = useCallback(async (jobId: string) => {
    try {
      attemptsRef.current += 1
      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        fail('Request timed out. Please try again.')
        return
      }

      const res = await fetch(`/api/jobs/status?id=${encodeURIComponent(jobId)}`, { cache: 'no-store' })

      if (!res.ok) {
        if (res.status === 404) {
          clearStoredJob()
          setLoading(false)
          stopPolling()
          return
        }
        pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
        return
      }

      const data = await res.json()
      if (data.status === 'completed' && data.result) {
        setLoading(false)
        clearStoredJob()
        stopPolling()
        onComplete(data.result as TResult)
        return
      }
      if (data.status === 'failed') {
        fail(data.error || 'Request failed')
        return
      }

      pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
    } catch {
      pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
    }
  }, [clearStoredJob, stopPolling, onComplete, fail])

  // Resume any in-flight job on mount
  useEffect(() => {
    const existing = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
    if (existing) {
      setLoading(true)
      attemptsRef.current = 0
      pollJob(existing)
    }
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Immediate poll on tab visible
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const existing = localStorage.getItem(storageKey)
      if (existing && loading) {
        stopPolling()
        attemptsRef.current = 0
        pollJob(existing)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loading, pollJob, stopPolling, storageKey])

  /**
   * Kick off a job. Returns:
   *  - the job response body if the server returned a direct (non-job) payload
   *    (e.g. cached already_exists response), so callers can handle both cases
   *  - null if a job was started and polling is in progress
   *  - undefined on network failure
   */
  const start = useCallback(async (url: string, body: Record<string, unknown>): Promise<any | null | undefined> => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        try {
          const data = await res.json()
          fail(data.error || `Request failed (${res.status})`)
        } catch {
          fail(`Request failed (${res.status})`)
        }
        return undefined
      }

      const data = await res.json()

      // If server returned a job_id, start polling
      if (data?.job_id) {
        try { localStorage.setItem(storageKey, data.job_id) } catch {}
        attemptsRef.current = 0
        pollJob(data.job_id)
        return null
      }

      // Otherwise the response is a direct result (cached / inline path)
      setLoading(false)
      return data
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Network error')
      return undefined
    }
  }, [storageKey, pollJob, fail])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    clearStoredJob()
    stopPolling()
  }, [clearStoredJob, stopPolling])

  return { start, loading, error, reset }
}
