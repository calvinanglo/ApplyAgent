'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')
    const rawNext = searchParams.get('next') || searchParams.get('redirect') || '/dashboard'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

    async function applyReferral() {
      const ref = localStorage.getItem('applyagent_ref')
      if (ref) {
        localStorage.removeItem('applyagent_ref')
        try {
          await fetch('/api/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: ref }),
          })
        } catch {}
      }
    }

    async function handleCallback() {
      // If there's a code in the URL, exchange it for a session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          await applyReferral()
          router.replace(next)
          return
        }
      }

      // Check if session already exists (hash fragment flow — Supabase client auto-handles #access_token)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await applyReferral()
        router.replace(next)
        return
      }

      // Listen for auth state change (catches hash fragments on mobile)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          router.replace(next)
        }
      })

      // Fallback — if nothing happens after 5 seconds, redirect to login
      setTimeout(() => {
        subscription.unsubscribe()
        router.replace('/login?error=auth_timeout')
      }, 5000)
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
