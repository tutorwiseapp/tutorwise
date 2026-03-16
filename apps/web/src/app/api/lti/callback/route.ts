/**
 * LTI 1.3 Callback — OIDC Authentication Response
 *
 * POST /api/lti/callback - Handles the OIDC auth response with id_token
 *
 * Step 2 of LTI 1.3 flow: Validates the id_token JWT, extracts LTI claims,
 * provisions or links TutorWise user, and redirects to the learning environment.
 *
 * @module api/lti/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

interface LTIClaims {
  iss: string;
  sub: string;
  aud: string;
  nonce: string;
  name?: string;
  email?: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type'?: string;
  'https://purl.imsglobal.org/spec/lti/claim/version'?: string;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id'?: string;
  'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id: string;
    label?: string;
    title?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/resource_link'?: {
    id: string;
    title?: string;
  };
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'?: {
    scope?: string[];
    lineitems?: string;
    lineitem?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const idToken = formData.get('id_token') as string;
    const state = formData.get('state') as string;

    if (!idToken || !state) {
      return NextResponse.json({ error: 'Missing id_token or state' }, { status: 400 });
    }

    // Decode JWT payload (signature verification done below)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid JWT format' }, { status: 400 });
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    ) as LTIClaims;

    // Validate issuer and look up platform
    const supabase = await createServiceRoleClient();

    const { data: platform } = await supabase
      .from('lti_platforms')
      .select('*')
      .eq('issuer', payload.iss)
      .eq('client_id', payload.aud)
      .eq('is_active', true)
      .single();

    if (!platform) {
      return NextResponse.json({ error: 'Unknown platform' }, { status: 403 });
    }

    // Verify JWT signature against platform's JWKS
    const signatureValid = await verifyJWTSignature(idToken, platform.jwks_endpoint);
    if (!signatureValid) {
      return NextResponse.json({ error: 'Invalid token signature' }, { status: 401 });
    }

    // Validate state matches a recent launch
    const { data: launch } = await supabase
      .from('lti_launches')
      .select('*')
      .eq('platform_id', platform.id)
      .eq('lti_user_id', payload.sub)
      .order('launched_at', { ascending: false })
      .limit(1)
      .single();

    if (!launch || (launch.custom_params as Record<string, string>)?.state !== state) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 403 });
    }

    // Extract LTI claims
    const roles = payload['https://purl.imsglobal.org/spec/lti/claim/roles'] || [];
    const context = payload['https://purl.imsglobal.org/spec/lti/claim/context'];
    const resourceLink = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const agsEndpoint = payload['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];
    const customParams = payload['https://purl.imsglobal.org/spec/lti/claim/custom'] || {};

    // Check if LTI user is already linked to a TutorWise account
    const { data: existingLink } = await supabase
      .from('lti_launches')
      .select('tutorwise_user_id')
      .eq('platform_id', platform.id)
      .eq('lti_user_id', payload.sub)
      .not('tutorwise_user_id', 'is', null)
      .order('launched_at', { ascending: false })
      .limit(1)
      .single();

    let tutorwiseUserId = existingLink?.tutorwise_user_id;

    // Auto-provision if email available and no existing link
    if (!tutorwiseUserId && payload.email) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', payload.email)
        .single();

      if (existingUser) {
        tutorwiseUserId = existingUser.id;
      }
      // Note: We don't auto-create Supabase auth users — they must register separately
      // or the school admin can pre-provision accounts
    }

    // Record launch with full LTI data
    await supabase.from('lti_launches').insert({
      platform_id: platform.id,
      lti_user_id: payload.sub,
      tutorwise_user_id: tutorwiseUserId || null,
      course_id: context?.id || null,
      resource_link_id: resourceLink?.id || null,
      roles,
      custom_params: customParams,
      lineitem_url: agsEndpoint?.lineitem || null,
    });

    // Determine redirect based on role and custom params
    const isInstructor = roles.some(r =>
      r.includes('Instructor') || r.includes('Administrator') || r.includes('TeachingAssistant')
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    let redirectPath: string;

    if (customParams.sage_agent_id) {
      // Deep link to specific AI agent
      redirectPath = `/sage/agent/${customParams.sage_agent_id}`;
    } else if (isInstructor) {
      redirectPath = '/admin/sage';
    } else {
      redirectPath = '/sage';
    }

    // Pass LTI context via query params for session binding
    const redirectUrl = new URL(redirectPath, baseUrl);
    redirectUrl.searchParams.set('lti', '1');
    redirectUrl.searchParams.set('platform', platform.id);
    if (context?.id) redirectUrl.searchParams.set('course', context.id);
    if (resourceLink?.id) redirectUrl.searchParams.set('resource', resourceLink.id);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('[LTI Callback] Error:', error);
    return NextResponse.json({ error: 'LTI authentication failed' }, { status: 500 });
  }
}

// --- JWT Verification ---

async function verifyJWTSignature(token: string, jwksUrl: string): Promise<boolean> {
  try {
    const [headerB64] = token.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8'));

    // Fetch JWKS
    const response = await fetch(jwksUrl);
    if (!response.ok) {
      console.error('[LTI] Failed to fetch JWKS:', response.status);
      return false;
    }

    const jwks = await response.json() as { keys: Array<{ kid?: string; kty: string; n: string; e: string }> };

    // Find matching key
    const key = header.kid
      ? jwks.keys.find((k: { kid?: string }) => k.kid === header.kid)
      : jwks.keys[0];

    if (!key) {
      console.error('[LTI] No matching JWK found');
      return false;
    }

    // Import key and verify
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [headerPart, payloadPart, signaturePart] = token.split('.');
    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const signature = Buffer.from(signaturePart, 'base64url');

    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, data);
  } catch (error) {
    console.error('[LTI] JWT verification error:', error);
    return false;
  }
}
