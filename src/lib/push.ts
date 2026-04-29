/**
 * Server-side Expo Push helper.
 *
 * Sends notifications to a user's registered device tokens via Expo's push
 * service (https://exp.host/--/api/v2/push/send). Fire-and-forget — failures
 * are logged but never thrown so they can't take down job processing.
 *
 * Hook into completeJob() / failJob() in lib/background-job.ts to fire a
 * notification when an evaluation, resume, or cover letter finishes.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string | number | boolean | null>
  /** Custom sound (default 'default') or null for silent notification */
  sound?: 'default' | null
  /** Badge count to set on iOS app icon */
  badge?: number
  /** Channel ID for Android (default 'default') */
  channelId?: string
}

interface ExpoMessage {
  to: string
  title: string
  body: string
  data?: PushPayload['data']
  sound?: PushPayload['sound']
  badge?: number
  channelId?: string
  priority?: 'default' | 'normal' | 'high'
}

/**
 * Send a push notification to all registered devices for a user.
 * Returns silently on any error — never throws.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return // misconfigured env, no-op

  try {
    const admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    )

    const db = admin as any
    const { data: tokens, error } = await db
      .from('expo_push_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (error || !tokens?.length) return

    const messages: ExpoMessage[] = tokens.map((t: { token: string; platform: string }) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: payload.sound === null ? null : 'default',
      badge: payload.badge,
      channelId: payload.channelId || 'default',
      priority: 'high',
    }))

    // Expo accepts up to 100 messages per request; we'll rarely have more.
    const chunks: ExpoMessage[][] = []
    for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100))

    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn(`[push] Expo returned ${res.status}: ${text.slice(0, 200)}`)
        continue
      }
      const result = await res.json().catch(() => null)
      // Expo response format: { data: [{ status, id, message?, details? }, ...] }
      const items: Array<{ status: string; message?: string; details?: { error?: string } }> =
        result?.data || []
      // Clean up tokens that Expo says are invalid (e.g. user uninstalled the app).
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.status === 'error' && item.details?.error === 'DeviceNotRegistered') {
          try {
            await db.from('expo_push_tokens').delete().eq('token', chunk[i].to)
          } catch { /* best effort */ }
        }
      }
    }
  } catch (err) {
    // Swallow all errors — push must never break job processing.
    console.warn('[push] sendPush failed:', err instanceof Error ? err.message : err)
  }
}
