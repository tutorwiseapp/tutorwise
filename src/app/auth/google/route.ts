/*
 * Filename: src/app/api/auth/google/route.ts
 * Purpose: Provides a server-side endpoint to initiate the Google OAuth flow.
 *
 * Change History:
 * C001 - 2025-07-22 : 18:00 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 18:00
 * Requirement ID (optional): VIN-D-02.3
 *
 * Change Summary:
 * Created a new server route to handle the initiation of the Google OAuth sign-in. It securely
 * calls `signInWithOAuth` on the server and redirects the user to the Google consent screen.
 * This is the correct, server-centric approach for OAuth.
 *
 * Impact Analysis:
 * This is the first step in the secure OAuth flow and is called by the frontend button.
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // Get the URL to redirect to from the request body
  const { redirectTo } = await request.json();

  // Call the server-side signInWithOAuth method
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // The redirect_to URL must be an absolute URL
      redirectTo,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The URL to redirect the user to the Google consent screen
  return NextResponse.json({ url: data.url });
}