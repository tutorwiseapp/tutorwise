/**
 * LTI 1.3 Launch — OIDC Initiation
 *
 * POST /api/lti/launch - Handles the OIDC login initiation from an LMS
 *
 * Step 1 of LTI 1.3 flow: Receives platform login hint, validates issuer,
 * redirects to platform's auth endpoint with OIDC params.
 *
 * @module api/lti/launch
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const iss = formData.get('iss') as string;
    const loginHint = formData.get('login_hint') as string;
    const targetLinkUri = formData.get('target_link_uri') as string;
    const ltiMessageHint = formData.get('lti_message_hint') as string | null;
    const clientId = formData.get('client_id') as string | null;

    if (!iss || !loginHint || !targetLinkUri) {
      return NextResponse.json(
        { error: 'Missing required LTI parameters (iss, login_hint, target_link_uri)' },
        { status: 400 }
      );
    }

    // Look up the registered platform
    const supabase = await createServiceRoleClient();

    let query = supabase
      .from('lti_platforms')
      .select('*')
      .eq('issuer', iss)
      .eq('is_active', true);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: platform, error } = await query.single();

    if (error || !platform) {
      console.error('[LTI Launch] Platform not found for issuer:', iss);
      return NextResponse.json({ error: 'Unknown LTI platform' }, { status: 403 });
    }

    // Generate state and nonce for OIDC
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store state temporarily (expires in 5 minutes)
    await supabase.from('lti_launches').insert({
      platform_id: platform.id,
      lti_user_id: loginHint,
      custom_params: { state, nonce, target_link_uri: targetLinkUri },
    });

    // Build OIDC auth redirect URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/lti/callback`;

    const authParams = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      client_id: platform.client_id,
      redirect_uri: callbackUrl,
      login_hint: loginHint,
      state,
      response_mode: 'form_post',
      nonce,
      prompt: 'none',
    });

    if (ltiMessageHint) {
      authParams.set('lti_message_hint', ltiMessageHint);
    }

    const authUrl = `${platform.auth_endpoint}?${authParams.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[LTI Launch] Error:', error);
    return NextResponse.json({ error: 'LTI launch failed' }, { status: 500 });
  }
}
