import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Origins allowed to call /api/* with Authorization: Bearer (mobile clients).
// Cookie-auth web requests use same-origin and don't need CORS.
const MOBILE_ORIGIN_PATTERNS: RegExp[] = [
  /^applyagent:\/\//i,                       // RN custom scheme
  /^https?:\/\/localhost(:\d+)?$/i,          // Expo dev tunnel
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^exp:\/\//i,                               // Expo Go
  /\.exp\.direct$/i,                          // Expo preview
]

function isAllowedMobileOrigin(origin: string | null): boolean {
  if (!origin) return false
  return MOBILE_ORIGIN_PATTERNS.some(rx => rx.test(origin))
}

function applyCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'authorization, content-type, x-device-id, x-app-version, x-platform'
  )
  response.headers.set('Access-Control-Allow-Credentials', 'false')
  response.headers.set('Access-Control-Max-Age', '86400')
  response.headers.set('Vary', 'Origin')
  return response
}

export async function updateSession(request: NextRequest) {
  // ── CORS for mobile clients hitting /api/* ────────────────────────────
  // Must run before any redirects so OPTIONS preflight succeeds.
  const origin = request.headers.get('origin')
  const isApi = request.nextUrl.pathname.startsWith('/api/')
  const allowedOrigin = isApi && isAllowedMobileOrigin(origin) ? origin! : null

  if (allowedOrigin && request.method === 'OPTIONS') {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), allowedOrigin)
  }

  // Redirect Vercel preview URLs to custom domain
  const host = request.headers.get('host') || ''
  if (host.includes('vercel.app') && !host.includes('localhost')) {
    const url = new URL(request.url)
    url.host = 'applyagent.ca'
    url.protocol = 'https'
    return NextResponse.redirect(url, 301)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/evaluate', '/applications', '/reports', '/resume', '/cover-letter', '/scan', '/pipeline', '/settings', '/billing', '/tools', '/story-bank', '/instructions']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Apply CORS headers to /api/* responses for allowed mobile origins.
  if (allowedOrigin) {
    applyCorsHeaders(supabaseResponse, allowedOrigin)
  }

  return supabaseResponse
}
