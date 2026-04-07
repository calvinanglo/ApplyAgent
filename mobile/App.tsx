import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as Updates from 'expo-updates'
import { AuthProvider } from './src/lib/auth'
import { AppNavigator } from './src/navigation/AppNavigator'

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

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  )
}
