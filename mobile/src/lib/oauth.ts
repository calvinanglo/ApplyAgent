/**
 * OAuth providers for mobile sign-in.
 *
 * Two flows:
 *   1. Google Sign-In via Supabase OAuth + expo-auth-session (PKCE)
 *      Works on both iOS and Android.
 *   2. Apple Sign-In via expo-apple-authentication (iOS only).
 *      Apple requires this when ANY social login is offered (guideline 4.8).
 *
 * Supabase config required (Dashboard → Authentication → Providers):
 *   - Enable Google provider with Web client ID + secret
 *   - Add redirect URL: applyagent://auth/callback
 *   - Apple provider: enable + add bundle id (Service ID for web; Bundle ID for native)
 */

import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Required by expo-auth-session to dismiss the in-app browser after OAuth.
WebBrowser.maybeCompleteAuthSession()

const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'applyagent',
  path: 'auth/callback',
})

interface OAuthResult {
  ok: boolean
  error?: string
}

/**
 * Sign in with Google via Supabase OAuth + PKCE.
 *
 * Steps:
 *   1. Ask Supabase for the Google authorization URL with our redirect.
 *   2. Open the URL in the in-app browser (SFSafariViewController on iOS,
 *      Custom Tabs on Android).
 *   3. User signs in → Google redirects to Supabase → Supabase redirects to
 *      `applyagent://auth/callback?code=...&...`.
 *   4. expo-auth-session captures the redirect, returns the URL.
 *   5. We extract the code/access_token and call setSession on the local
 *      Supabase client to establish the session.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URI,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    if (error || !data?.url) {
      return { ok: false, error: error?.message || 'Failed to start Google sign-in' }
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI, {
      showInRecents: false,
      preferEphemeralSession: true,
    })

    if (result.type !== 'success' || !result.url) {
      return { ok: false, error: result.type === 'cancel' ? 'Cancelled' : 'Sign-in did not complete' }
    }

    // Parse tokens from the redirect URL fragment OR exchange the code.
    const url = new URL(result.url)
    const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const code = params.get('code')

    if (accessToken && refreshToken) {
      // Implicit flow result — set the session directly.
      const { error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (setErr) return { ok: false, error: setErr.message }
      return { ok: true }
    }

    if (code) {
      // PKCE flow — exchange the code for a session.
      const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code)
      if (exchErr) return { ok: false, error: exchErr.message }
      return { ok: true }
    }

    return { ok: false, error: 'Sign-in completed but no session was returned' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Google sign-in failed' }
  }
}

/**
 * Sign in with Apple. iOS only — returns false on Android so the UI can
 * hide the button. Uses expo-apple-authentication (native Apple Sign-In) and
 * passes the identity token to Supabase via signInWithIdToken (no browser
 * redirect, no deep-link round trip).
 *
 * Lazy-loaded so Android builds don't pull in the iOS-only native module.
 */
export async function signInWithApple(): Promise<OAuthResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple Sign-In is iOS only' }
  }
  try {
    const AppleAuthentication = await import('expo-apple-authentication').catch(() => null)
    if (!AppleAuthentication) {
      return { ok: false, error: 'expo-apple-authentication not installed' }
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    if (!credential.identityToken) {
      return { ok: false, error: 'No identity token from Apple' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    if (err?.code === 'ERR_CANCELED') {
      return { ok: false, error: 'Cancelled' }
    }
    return { ok: false, error: err?.message || 'Apple sign-in failed' }
  }
}

/**
 * Whether Apple Sign-In is available (iOS 13+ on a real device).
 * Use this to conditionally show the Apple button.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try {
    const AppleAuthentication = await import('expo-apple-authentication').catch(() => null)
    if (!AppleAuthentication) return false
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}
