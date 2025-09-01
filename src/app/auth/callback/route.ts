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
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin)
}