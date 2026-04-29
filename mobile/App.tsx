import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as Updates from 'expo-updates'
import { AuthProvider } from './src/lib/auth'
import { AppNavigator, navigationRef } from './src/navigation/AppNavigator'
import { addNotificationTapHandler } from './src/lib/push'

async function checkForUpdates() {
  if (__DEV__) return
  try {
    const update = await Updates.checkForUpdateAsync()
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync()
      await Updates.reloadAsync()
    }
  } catch {
    // Update check failed silently — app continues with cached version
  }
}

export default function App() {
  useEffect(() => {
    checkForUpdates()
  }, [])

  // Route notification taps to the right screen.
  //   evaluation / pipeline_process → ReportDetail (jobs that produce a report_id)
  //   resume_pdf / cover_letter     → ReportDetail (the job carries a report context)
  //   anything else                 → Dashboard (safe default)
  useEffect(() => {
    return addNotificationTapHandler(({ kind, success }) => {
      if (!navigationRef.isReady()) return
      if (success === 0) {
        // Failed jobs land on Dashboard so user sees the error context
        navigationRef.navigate('Tabs', { screen: 'Dashboard' })
        return
      }
      if (kind === 'evaluation' || kind === 'pipeline_process' || kind === 'resume_pdf' || kind === 'cover_letter') {
        // We don't have report_id for downstream jobs reliably without a
        // server-side lookup; default to Dashboard where recent results live.
        // Future: include report_id in the push data payload.
        navigationRef.navigate('Tabs', { screen: 'Dashboard' })
      } else {
        navigationRef.navigate('Tabs', { screen: 'Dashboard' })
      }
    })
  }, [])

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  )
}
