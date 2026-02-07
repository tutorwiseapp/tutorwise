/**
 * Filename: apps/web/src/app/api/calendar/callback/outlook/route.ts
 * Purpose: Handle Microsoft Outlook OAuth callback
 * Created: 2026-02-07
 *
 * After user grants calendar permissions, Microsoft redirects here with auth code.
 * We exchange the code for tokens and store the connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { exchangeOutlookCode } from '@/lib/calendar/outlook';
import { encryptToken } from '@/lib/calendar/encryption';
import { bulkSyncExistingBookings } from '@/lib/calendar/bulk-sync';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/callback/outlook
 * Handle OAuth redirect from Microsoft
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle user cancellation
  if (error === 'access_denied') {
    return NextResponse.redirect(
      new URL('/account/settings/calendar?calendar_error=cancelled', request.url)
    );
  }

  if (error) {
    console.error('[Outlook Callback] OAuth error:', error);
    return NextResponse.redirect(
      new URL('/account/settings/calendar?calendar_error=oauth_failed', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/account/settings/calendar?calendar_error=no_code', request.url)
    );
  }

  try {
    // 1. Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/account/settings/calendar?calendar_error=unauthorized', request.url)
      );
    }

    // 2. Exchange auth code for tokens
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/calendar/callback/outlook`;

    const tokens = await exchangeOutlookCode(code, redirectUri);

    // 3. Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // 4. Store connection in database (upsert in case user reconnects)
    const { error: dbError } = await supabase.from('calendar_connections').upsert(
      {
        profile_id: user.id,
        provider: 'outlook',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expiry: tokens.token_expiry,
        email: tokens.email,
        sync_enabled: true,
        sync_mode: 'one_way',
        status: 'active',
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'profile_id,provider',
      }
    );

    if (dbError) {
      console.error('[Outlook Callback] Database error:', dbError);
      return NextResponse.redirect(
        new URL('/account/settings/calendar?calendar_error=db_failed', request.url)
      );
    }

    // 5. Trigger bulk sync for existing bookings (async - don't block redirect)
    bulkSyncExistingBookings(user.id)
      .then((result) => {
        console.log(
          `[Outlook Callback] Bulk sync completed: ${result.synced}/${result.total} synced, ${result.failed} failed`
        );
      })
      .catch((error) => {
        console.error('[Outlook Callback] Bulk sync failed:', error);
        // Don't fail the connection if bulk sync fails
      });

    // 6. Redirect back to settings with success message
    return NextResponse.redirect(
      new URL('/account/settings/calendar?calendar_success=outlook_connected', request.url)
    );
  } catch (error) {
    console.error('[Outlook Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/account/settings/calendar?calendar_error=callback_failed', request.url)
    );
  }
}
