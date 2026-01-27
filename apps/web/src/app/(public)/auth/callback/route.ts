// apps/web/src/app/auth/callback/route.ts
// Handles OAuth callbacks, email confirmation, and password reset flows

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/onboarding'

  console.log('[Auth Callback] Received params:', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next
  })

  // In Next.js 14+, cookies() returns a Promise and must be awaited
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )

  // Handle PKCE code exchange (OAuth and some email flows)
  if (code) {
    console.log('[Auth Callback] Exchanging code for session...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[Auth Callback] Code exchange error:', error.message, error)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }
    console.log('[Auth Callback] Code exchange successful')
  }

  // Handle token_hash verification (email confirmation, magic links)
  if (token_hash && type) {
    console.log('[Auth Callback] Verifying OTP with token_hash...')
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
    })
    if (error) {
      console.error('[Auth Callback] OTP verification error:', error.message, error)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }
    console.log('[Auth Callback] OTP verification successful')
  }

  // If neither code nor token_hash, check if user is already authenticated
  if (!code && !token_hash) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.log('[Auth Callback] No code, token_hash, or existing session')
      return NextResponse.redirect(`${requestUrl.origin}/login?error=No authentication parameters provided`)
    }
    console.log('[Auth Callback] User already has session')
  }

  // Redirect to the next page
  console.log('[Auth Callback] Redirecting to:', next)
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}