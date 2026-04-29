/**
 * Push notifications for the mobile client.
 *
 * Flow:
 *   1. After sign-in, registerPushOnLogin() requests permission, fetches the
 *      Expo push token, and POSTs it to /api/push/register.
 *   2. Server-side, lib/push.ts in the web app sends notifications via
 *      Expo's push service when background jobs complete or fail.
 *   3. Tap on a notification → addNotificationResponseReceivedListener fires
 *      → we route to the right screen using the embedded job_id + kind.
 *
 * Permission request is intentionally deferred until AFTER sign-in (App
 * Review hates pre-emptive prompts on cold launch).
 */

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { registerPushToken, unregisterPushToken } from './api'

// Foreground behavior: show banner + heads-up even when the app is open so
// users see the result of their job is ready.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

let registered = false

export async function registerPushOnLogin(): Promise<{ ok: boolean; reason?: string }> {
  if (!Device.isDevice) {
    return { ok: false, reason: 'simulator' }
  }

  // Request permission. iOS requires this; Android <13 grants automatically.
  const { status: existing } = await Notifications.getPermissionsAsync()
  let status = existing
  if (existing !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync()
    status = requested
  }
  if (status !== 'granted') {
    return { ok: false, reason: 'permission_denied' }
  }

  // Android requires an explicit notification channel for the foreground
  // banner to behave properly.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  // Get the Expo push token (NOT the device APNs/FCM token — Expo Push proxies).
  const projectId = '2c381589-1d10-4c4b-b1ba-9ec1f20716d5' // matches app.json EAS projectId
  let tokenObj
  try {
    tokenObj = await Notifications.getExpoPushTokenAsync({ projectId })
  } catch (e) {
    return { ok: false, reason: 'token_fetch_failed' }
  }

  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android'
  try {
    await registerPushToken(tokenObj.data, platform)
    registered = true
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'server_register_failed' }
  }
}

export async function unregisterPushOnLogout(): Promise<void> {
  if (!registered) return
  try {
    await unregisterPushToken()
  } catch {
    // best effort — tokens get cleaned up server-side when DeviceNotRegistered
  }
  registered = false
}

/**
 * Wire up notification-tap handlers. Call once in the root component.
 * onResponse receives the notification data so the app can route to the
 * relevant screen.
 */
export function addNotificationTapHandler(
  onResponse: (data: { job_id?: string; kind?: string; success?: number }) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data || {}
    onResponse({
      job_id: typeof data.job_id === 'string' ? data.job_id : undefined,
      kind: typeof data.kind === 'string' ? data.kind : undefined,
      success: typeof data.success === 'number' ? data.success : 0,
    })
  })
  return () => sub.remove()
}
