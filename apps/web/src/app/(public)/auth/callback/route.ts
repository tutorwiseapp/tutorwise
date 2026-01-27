// apps/web/src/app/auth/callback/route.ts

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Supabase auth callback error:', error.message)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Could not authenticate user`)
    }
  }

  // URL to redirect to after sign in process completes
  // Support custom redirect via 'next' parameter, default to /onboarding
  const next = requestUrl.searchParams.get('next') || '/onboarding'
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}