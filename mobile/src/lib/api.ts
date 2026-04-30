import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { supabase } from './supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

// ── Device ID ────────────────────────────────────────────────────────────
// Stable per-install identifier sent in X-Device-Id header so the server
// can scope rate-limits per device (phone + browser don't starve each other)
// and so we can target push notifications to specific installs.

const DEVICE_ID_KEY = 'applyagent.device_id'
let cachedDeviceId: string | null = null

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
    if (!id) {
      // RFC 4122 v4 UUID, no external dep
      id = 'd' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id)
    }
    cachedDeviceId = id
    return id
  } catch {
    // Fallback if SecureStore unavailable (web / unusual env)
    cachedDeviceId = 'fallback-' + Date.now()
    return cachedDeviceId
  }
}

// ── HTTP wrapper ─────────────────────────────────────────────────────────
// - Auto-injects Authorization: Bearer <access_token>
// - Auto-injects X-Device-Id, X-Platform, X-App-Version
// - On 401: refreshes the session once, then retries
// - On 5xx / network error: exponential backoff (250, 500, 1000ms), max 2 retries

interface FetchOptions extends RequestInit {
  /** Skip the auto-retry-on-401 refresh (used internally by refresh itself) */
  skipRefresh?: boolean
  /** Number of retries already attempted (internal) */
  _retry?: number
}

class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    return !error && !!data.session
  } catch {
    return false
  }
}

const APP_VERSION = '1.0.0' // TODO: read from expo-constants when wired

export async function authFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  const token = await getAccessToken()
  if (!token) throw new ApiError(401, 'Not authenticated')

  const deviceId = await getDeviceId()
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-Device-Id': deviceId,
    'X-Platform': Platform.OS,
    'X-App-Version': APP_VERSION,
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  // 401 → refresh once, retry
  if (res.status === 401 && !options.skipRefresh) {
    const ok = await refreshSession()
    if (ok) {
      return authFetch(path, { ...options, skipRefresh: true })
    }
    throw new ApiError(401, 'Session expired')
  }

  // 5xx / network → exponential backoff
  if (res.status >= 500 && (options._retry ?? 0) < 2) {
    const attempt = options._retry ?? 0
    await new Promise(r => setTimeout(r, 250 * Math.pow(2, attempt)))
    return authFetch(path, { ...options, _retry: attempt + 1 })
  }

  return res
}

async function expectJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data)
  }
  return res.json() as Promise<T>
}

// ── Job polling ──────────────────────────────────────────────────────────

export interface JobStatus<TResult = unknown> {
  id: string
  kind: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: TResult
  error?: string
  created_at: string
  completed_at: string | null
}

export async function getJobStatus<TResult = unknown>(jobId: string): Promise<JobStatus<TResult>> {
  const res = await authFetch(`/api/jobs/status?id=${encodeURIComponent(jobId)}`)
  return expectJson<JobStatus<TResult>>(res)
}

/** Poll a job until it completes or fails. Calls onProgress on each tick. */
export async function pollJob<TResult = unknown>(
  jobId: string,
  options: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<JobStatus<TResult>> {
  const interval = options.intervalMs ?? 2500
  const timeout = options.timeoutMs ?? 5 * 60_000
  const start = Date.now()
  while (true) {
    if (options.signal?.aborted) throw new ApiError(0, 'Aborted')
    if (Date.now() - start > timeout) throw new ApiError(0, 'Job timed out')
    const status = await getJobStatus<TResult>(jobId)
    if (status.status === 'completed' || status.status === 'failed') return status
    await new Promise(r => setTimeout(r, interval))
  }
}

// ── Endpoint wrappers ────────────────────────────────────────────────────

export async function evaluate(jdText: string): Promise<{ job_id: string }> {
  const res = await authFetch('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ jd_text: jdText }),
  })
  return expectJson<{ job_id: string }>(res)
}

export async function generatePdf(
  reportId: string,
  modelTier: string = 'fast',
  pageLength: 1 | 2 = 1,
): Promise<{ job_id: string }> {
  const res = await authFetch('/api/generate-pdf', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId, model_tier: modelTier, page_length: pageLength }),
  })
  return expectJson<{ job_id: string }>(res)
}

export async function generateCoverLetter(reportId: string, modelTier: string = 'fast'): Promise<{ job_id: string }> {
  const res = await authFetch('/api/cover-letter', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId, model_tier: modelTier }),
  })
  return expectJson<{ job_id: string }>(res)
}

export interface AccountCredits {
  balance: number
  subscription: {
    id: string
    plan_id: string
    status: string
    current_period_end: string
    cancel_at_period_end: boolean
    provider: 'stripe' | 'revenuecat'
    external_id: string | null
  } | null
  recent_transactions: Array<{
    amount: number
    action: string
    balance_after: number
    created_at: string
    description: string | null
  }>
}

export async function getAccountCredits(): Promise<AccountCredits> {
  const res = await authFetch('/api/account/credits')
  return expectJson<AccountCredits>(res)
}

export async function getSignedFileUrl(path: string, bucket?: string): Promise<{ url: string; expires_at: string }> {
  const res = await authFetch('/api/files/signed-url', {
    method: 'POST',
    body: JSON.stringify({ path, bucket }),
  })
  return expectJson<{ url: string; expires_at: string }>(res)
}

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android'
): Promise<{ ok: true }> {
  const deviceId = await getDeviceId()
  const res = await authFetch('/api/push/register', {
    method: 'POST',
    body: JSON.stringify({ token, device_id: deviceId, platform, app_version: APP_VERSION }),
  })
  return expectJson<{ ok: true }>(res)
}

export async function unregisterPushToken(): Promise<{ ok: true }> {
  const deviceId = await getDeviceId()
  const res = await authFetch('/api/push/unregister', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId }),
  })
  return expectJson<{ ok: true }>(res)
}

export { ApiError }
