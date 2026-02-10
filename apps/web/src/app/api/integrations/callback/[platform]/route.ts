/**
 * GET /api/integrations/callback/[platform]
 * Purpose: OAuth callback endpoint for external platform integrations (v5.0)
 *
 * This endpoint handles the OAuth callback from the external platform,
 * exchanges the authorization code for access/refresh tokens, and stores
 * them in the student_integration_links table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// Platform OAuth token exchange configurations
const TOKEN_CONFIGS = {
  google_classroom: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/callback/google_classroom`,
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
};

export async function GET(request: NextRequest, props: { params: Promise<{ platform: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { platform } = params;
    const { searchParams } = new URL(request.url);

    // 1. Extract OAuth parameters from callback URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Missing+required+parameters`
      );
    }

    // 2. Validate state parameter
    let stateData: { user_id: string; platform: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch (_e) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Invalid+state+parameter`
      );
    }

    // Check if state timestamp is too old (> 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Authorization+expired`
      );
    }

    // 3. Verify authenticated user matches state
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== stateData.user_id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Authentication+mismatch`
      );
    }

    // 4. Check if platform is supported
    if (!TOKEN_CONFIGS[platform as keyof typeof TOKEN_CONFIGS]) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Unsupported+platform`
      );
    }

    const config = TOKEN_CONFIGS[platform as keyof typeof TOKEN_CONFIGS];

    // 5. Exchange authorization code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Token+exchange+failed`
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, scope } = tokens;

    if (!access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=No+access+token+received`
      );
    }

    // 6. Fetch external user ID from platform
    const userInfoResponse = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info from platform');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Failed+to+fetch+user+info`
      );
    }

    const userInfo = await userInfoResponse.json();
    const external_user_id = userInfo.id || userInfo.sub;

    // 7. Store or update integration link in database
    const { error: upsertError } = await supabase
      .from('student_integration_links')
      .upsert({
        student_profile_id: user.id,
        platform_name: platform,
        external_user_id,
        auth_token: access_token,
        refresh_token: refresh_token || null,
        scopes: scope ? scope.split(' ') : [],
        linked_at: new Date().toISOString(),
      }, {
        onConflict: 'student_profile_id,platform_name',
      });

    if (upsertError) {
      console.error('Error storing integration link:', upsertError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Failed+to+store+integration`
      );
    }

    // 8. TODO: Log to audit_log
    // await logAuditEvent({
    //   action: 'INTEGRATION_CONNECTED',
    //   user_id: user.id,
    //   resource_type: 'integration',
    //   resource_id: platform,
    // });

    // 9. Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=success&platform=${platform}`
    );

  } catch (error) {
    console.error(`Error in GET /api/integrations/callback/${params.platform}:`, error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account/settings?integration=error&message=Internal+server+error`
    );
  }
}
