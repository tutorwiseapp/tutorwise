// Filename: src/app/api/auth/logout/route.ts
// FIXED LOGOUT HANDLER - Create proper logout API route

import { createClient } from '@/utils/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    // --- THIS IS THE FIX ---
    // Perform a global sign-out to clear the Google session as well.
    await supabase.auth.signOut({ scope: 'global' });
  }

  // URL to redirect to after logout
  const redirectUrl = new URL('/', req.url);

  return NextResponse.redirect(redirectUrl, {
    // A 303 redirect is required to change a POST request into a GET request
    status: 303,
  });
}