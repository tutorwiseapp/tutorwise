/**
 * Filename: apps/web/src/app/api/calendar/callback/google/route.ts
 * Purpose: Handle Google Calendar OAuth callback
 * Created: 2026-02-06
 *
 * Exchanges authorization code for tokens and stores connection in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/calendar/google';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/callback/google?code=xxx
 * Handle OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle user cancellation
  if (error === 'access_denied') {
    return NextResponse.redirect(
      new URL('/account/settings?calendar_error=cancelled', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/account/settings?calendar_error=no_code', request.url)
    );
  }

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL('/login?redirect=/account/settings', request.url)
      );
    }

    // 2. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // 3. Get user's email from Google
    const email = await getGoogleUserEmail(tokens.access_token);

    // 4. Store connection in database
    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert({
        profile_id: user.id,
        provider: 'google',
        access_token: tokens.access_token, // TODO: Encrypt before storage in production
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.token_expiry,
        calendar_id: 'primary',
        email,
        sync_enabled: true,
        sync_mode: 'one_way',
        status: 'active',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'profile_id,provider',
      });

    if (dbError) {
      console.error('[Calendar Callback] Database error:', dbError);
      throw dbError;
    }

    console.log(`[Calendar Callback] ✅ Google Calendar connected for user ${user.id}`);

    return NextResponse.redirect(
      new URL('/account/settings?calendar_success=google_connected', request.url)
    );
  } catch (error) {
    console.error('[Calendar Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/account/settings?calendar_error=connection_failed', request.url)
    );
  }
}
