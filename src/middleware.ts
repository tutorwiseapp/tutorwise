/*
 * Filename: src/middleware.ts
 * Purpose: Implements Supabase session management middleware.
 * Change History:
 * C004 - 2025-09-02 : 15:00 - Migrated to use Supabase SSR client for session refreshing.
 * Last Modified: 2025-09-02 : 15:00
 * Requirement ID: VIN-AUTH-MIG-03
 * Change Summary: This middleware now uses the Supabase SSR client. Its primary responsibility is to refresh the user's session cookie on every request, ensuring the user remains logged in as they navigate the site. It also handles the server-side portion of the OAuth code exchange.
 */
import { createClient } from '@/utils/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}