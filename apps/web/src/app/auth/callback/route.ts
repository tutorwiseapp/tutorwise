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
  
  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // --- THIS IS THE FIX ---
      // Redirect to the dashboard after a successful login to ensure the 
      // new session is correctly registered by the browser.
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // If there's an error, redirect the user to an error page.
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}