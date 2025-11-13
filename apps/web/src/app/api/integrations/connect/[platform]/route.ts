/**
 * POST /api/integrations/connect/[platform]
 * Purpose: Initiate OAuth flow for external platform integration (v5.0)
 *
 * This endpoint generates the OAuth consent URL for the specified platform
 * (e.g., google_classroom). The student will be redirected to this URL to
 * authorize TutorWise to access their learning platform data.
 *
 * Supported platforms:
 * - google_classroom: Google Classroom integration
 * - khan_academy: Khan Academy integration (future)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// Platform OAuth configurations
const OAUTH_CONFIGS = {
  google_classroom: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    scopes: [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/callback/google_classroom`,
  },
  // Future platforms can be added here
  // khan_academy: { ... },
};

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const supabase = await createClient();
    const { platform } = params;

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Verify user has student role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can connect learning platform integrations' },
        { status: 403 }
      );
    }

    // 3. Check if platform is supported
    if (!OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS]) {
      return NextResponse.json(
        { error: `Platform '${platform}' is not supported` },
        { status: 400 }
      );
    }

    const config = OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS];

    // 4. Check for missing OAuth credentials
    if (!config.clientId) {
      console.error(`Missing OAuth client ID for platform: ${platform}`);
      return NextResponse.json(
        { error: 'OAuth configuration incomplete. Please contact support.' },
        { status: 500 }
      );
    }

    // 5. Generate OAuth authorization URL with state parameter
    const state = Buffer.from(
      JSON.stringify({
        user_id: user.id,
        platform,
        timestamp: Date.now(),
      })
    ).toString('base64url');

    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', config.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent screen

    return NextResponse.json({
      success: true,
      authorization_url: authUrl.toString(),
      platform,
    });

  } catch (error) {
    console.error(`Error in POST /api/integrations/connect/${params.platform}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
