/**
 * Google Classroom OAuth — Callback (v1.0)
 *
 * GET /api/integrations/google-classroom/callback
 * Exchanges the code for tokens and stores them in tutor_integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect('/settings?error=google_classroom_not_configured');
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // user.id passed through OAuth
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`/settings?error=google_classroom_denied`);
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google-classroom/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    console.error('[google-classroom] Token exchange failed:', tokens);
    return NextResponse.redirect(`/settings?error=google_classroom_token_failed`);
  }

  const supabase = await createClient();

  // Upsert integration
  const { error: upsertError } = await supabase
    .from('tutor_integrations')
    .upsert(
      {
        tutor_id: state,
        provider: 'google_classroom',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        metadata: { scope: tokens.scope },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id,provider' }
    );

  if (upsertError) {
    console.error('[google-classroom] Upsert error:', upsertError);
    return NextResponse.redirect(`/settings?error=google_classroom_save_failed`);
  }

  return NextResponse.redirect(`/settings?success=google_classroom_connected`);
}
