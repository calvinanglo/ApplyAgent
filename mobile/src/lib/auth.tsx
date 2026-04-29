import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { registerPushOnLogin, unregisterPushOnLogout } from './push'
import { configurePurchases, loginPurchases, logoutPurchases } from './rc'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Configure RevenueCat as soon as the app boots (anonymous mode is fine
    // until login). Internally a no-op on Android since RC_ENABLED is false
    // there — Android uses Stripe via web only.
    void configurePurchases().catch(() => {})

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session?.user) {
        // Restored session — re-register push and (on iOS) link RC to user.
        void registerPushOnLogin().catch(() => {})
        void loginPurchases(session.user.id).catch(() => {})
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Register push (and on iOS link RC) only on actual sign-in events.
      if (event === 'SIGNED_IN' && session?.user) {
        void registerPushOnLogin().catch(() => {})
        void loginPurchases(session.user.id).catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Push registration runs via the SIGNED_IN event listener above.
  }

  async function signUp(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) throw error
  }

  async function signOut() {
    // Unregister push BEFORE clearing the session so the API call still has
    // a valid Bearer token. Then disconnect RevenueCat from this user
    // (without revoking entitlements — they're still valid for the Apple ID).
    await unregisterPushOnLogout().catch(() => {})
    await logoutPurchases().catch(() => {})
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
