/*
 * Filename: src/app/auth/callback/route.ts
 * Purpose: Handles the server-side OAuth callback from Supabase.
 * Change History:
 * C001 - 2025-09-02 : 16:00 - Initial creation.
 * Last Modified: 2025-09-02 : 16:00
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This route is a required part of the Supabase OAuth flow. It securely exchanges an authorization code from the redirect for a user session and then redirects the user back to the application's homepage.
 */
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error.message)
        // If it's a flow_state error, try to handle gracefully
        if (error.message.includes('flow_state')) {
          return NextResponse.redirect(`${origin}/login?error=session_expired`)
        }
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
      }

      if (data.session) {
        // Successfully established session
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Unexpected auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}