import { supabase } from './supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return res
}

export async function evaluate(jdText: string) {
  const res = await authFetch('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ jd_text: jdText }),
  })
  return res
}

export async function generatePdf(reportId: string) {
  return authFetch('/api/generate-pdf', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId }),
  })
}

export async function generateCoverLetter(reportId: string) {
  const res = await authFetch('/api/cover-letter', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId }),
  })
  return res.json()
}
