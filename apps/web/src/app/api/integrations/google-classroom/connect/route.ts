/**
 * Google Classroom OAuth — Initiate (v1.0)
 *
 * GET /api/integrations/google-classroom/connect
 * Redirects the tutor to Google's OAuth consent screen.
 * Requires GOOGLE_CLASSROOM_CLIENT_ID + GOOGLE_CLASSROOM_CLIENT_SECRET in env.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google Classroom not configured', unconfigured: true }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google-classroom/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: user.id, // pass user ID through OAuth flow
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
