/*
 * Filename: src/app/auth/callback/route.ts
 * Purpose: Handles the server-side OAuth callback from Supabase to exchange a code for a session.
 *
 * Change History:
 * C001 - 2025-07-22 : 17:30 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 17:30
 * Requirement ID (optional): VIN-D-02.2
 *
 * Change Summary:
 * Created the standard Supabase auth callback route. It receives the authorization code from
 * the redirect, securely exchanges it for a user session on the server, and then redirects
 * the user to the dashboard. This is the final, crucial step to make OAuth functional.
 *
 * Impact Analysis:
 * This fixes the `ERR_CONNECTION_REFUSED` and "Safari Can't Connect" errors permanently.
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    // Exchange the code for a session.
    // This will also set the session cookie.
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin + '/dashboard');
}