/**
 * Theme system mirroring the web's globals.css color tokens (light + dark).
 *
 * The web uses oklch color space inside Tailwind v4. RN can't render oklch
 * so we convert each token to hex. Names + intent are 1:1 with the web.
 *
 * Mode resolution:
 *   1. Manual override (stored in AsyncStorage) wins.
 *   2. Otherwise, follow OS color scheme (Appearance).
 *
 * Use:
 *   const { theme, mode, setMode } = useTheme()
 *   <View style={{ backgroundColor: theme.background }}>
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface Theme {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  // Extra semantic colors not in web tokens
  success: string
  warning: string
}

export const lightTheme: Theme = {
  background: '#ffffff',
  foreground: '#252525',
  card: '#ffffff',
  cardForeground: '#252525',
  popover: '#ffffff',
  popoverForeground: '#252525',
  primary: '#252525',
  primaryForeground: '#fafafa',
  secondary: '#f5f5f5',
  secondaryForeground: '#252525',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  accent: '#f5f5f5',
  accentForeground: '#252525',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  border: '#e5e5e5',
  input: '#e5e5e5',
  ring: '#a3a3a3',
  success: '#16a34a',
  warning: '#ca8a04',
}

export const darkTheme: Theme = {
  background: '#0a0a0a',
  foreground: '#fafafa',
  card: '#171717',
  cardForeground: '#fafafa',
  popover: '#171717',
  popoverForeground: '#fafafa',
  primary: '#fafafa',
  primaryForeground: '#252525',
  secondary: '#262626',
  secondaryForeground: '#fafafa',
  muted: '#262626',
  mutedForeground: '#a3a3a3',
  accent: '#262626',
  accentForeground: '#fafafa',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: '#262626',
  input: '#262626',
  ring: '#525252',
  success: '#22c55e',
  warning: '#eab308',
}

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  mode: ThemeMode
  resolvedMode: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  mode: 'system',
  resolvedMode: 'light',
  setMode: () => {},
})

const STORAGE_KEY = 'applyagent.theme_mode'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  )

  // Load saved mode on boot
  useEffect(() => {
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY)
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved)
        }
      } catch {
        // SecureStore/AsyncStorage unavailable on first run — default to system
      }
    })()
  }, [])

  // Listen for system color scheme changes (auto-update when in 'system' mode)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light')
    })
    return () => sub.remove()
  }, [])

  function setMode(next: ThemeMode) {
    setModeState(next)
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }

  const resolvedMode: 'light' | 'dark' = mode === 'system' ? systemScheme : mode
  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ theme, mode, resolvedMode, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
