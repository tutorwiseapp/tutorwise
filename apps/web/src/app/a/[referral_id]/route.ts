/*
 * Filename: src/app/a/[referral_id]/route.ts
 * Purpose: Handles referral link clicks, creates lead-gen record, sets HMAC-signed cookie
 * Created: 2025-11-02
 * Updated: 2025-12-16 - Hierarchical attribution + HMAC signatures (Migration 091)
 * Specification: SDD v5.0, Section 5 (Attribution Capture) | Patent Section 2
 * Change Summary: Added HMAC cookie signing for tamper detection, pass context to auth
 */
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * Generate HMAC signature for cookie value
 * Patent Section 2.2: Cookie Security with HMAC
 */
function generateCookieSignature(value: string): string {
  const secret = process.env.REFERRAL_COOKIE_SECRET;

  if (!secret) {
    console.warn('REFERRAL_COOKIE_SECRET not set - cookies will not be signed');
    return '';
  }

  return crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('hex');
}

/**
 * Create signed cookie value
 * Format: "referral_id.signature"
 */
function createSignedCookieValue(referralId: string): string {
  const signature = generateCookieSignature(referralId);

  if (!signature) {
    // No secret configured - return unsigned (legacy support)
    return referralId;
  }

  return `${referralId}.${signature}`;
}

/**
 * GET /a/[referral_id]
 * Tracks referral click and redirects to homepage
 *
 * Patent Reference: Section 2 (Referral Metadata Capture)
 * - Section 2.1: URL Parameter Storage
 * - Section 2.2: First-Party Cookie Storage (HMAC-signed)
 *
 * For logged-in users: Creates 'Referred' record with referred_profile_id
 * For anonymous users: Creates 'Referred' record, sets HMAC-signed cookie
 */
export async function GET(request: NextRequest, props: { params: Promise<{ referral_id: string }> }) {
  const params = await props.params;
  const { referral_id } = params;
  const supabase = await createClient();

  try {
    // 1. Get referrer's profile_id from their secure referral_code (Patent Section 2.1)
    // Note: Codes are case-sensitive (e.g., kRz7Bq2 != krz7bq2)
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', referral_id) // Case-sensitive match
      .single();

    if (referrerError || !referrerProfile) {
      console.error('[Referral] Invalid referral code:', referral_id);
      return NextResponse.redirect(new URL('/?error=invalid_referral', request.url));
    }

    const agent_id = referrerProfile.id;
    const referral_code = referrerProfile.referral_code;

    console.log('[Referral] Valid code:', referral_code, 'Agent:', agent_id);

    // 2. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Create referral record (Migration 051: referrer_profile_id → agent_id)
    if (user) {
      // ========================================
      // REGISTERED USER FUNNEL
      // ========================================
      console.log('[Referral] Logged-in user:', user.id);

      // Create referral record with referred_profile_id
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          agent_id,
          referred_profile_id: user.id,
          status: 'Referred',
          attribution_method: 'url_parameter' // Migration 091
        });

      if (referralError) {
        console.error('[Referral] Error creating referral for logged-in user:', referralError);
      } else {
        console.log('[Referral] Created referral record for logged-in user');
      }
    } else {
      // ========================================
      // UNREGISTERED USER FUNNEL (Anonymous)
      // ========================================
      console.log('[Referral] Anonymous user - setting cookie');

      // Create anonymous referral record and store ID in HMAC-signed cookie
      const { data: referralRecord, error: referralError } = await supabase
        .from('referrals')
        .insert({
          agent_id,
          referred_profile_id: null,
          status: 'Referred',
          attribution_method: null // Will be set to 'cookie' on signup if used
        })
        .select('id')
        .single();

      if (referralError || !referralRecord) {
        console.error('[Referral] Error creating anonymous referral:', referralError);
      } else {
        // Set secure, httpOnly, HMAC-signed cookie (Patent Section 2.2)
        const cookieStore = await cookies();
        const signedValue = createSignedCookieValue(referralRecord.id);

        cookieStore.set('tutorwise_referral_id', signedValue, {
          httpOnly: true, // XSS protection
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: 'lax', // CSRF protection
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        });

        console.log('[Referral] Set HMAC-signed cookie:', {
          referralId: referralRecord.id,
          hasSigned: signedValue.includes('.'),
          cookieLength: signedValue.length
        });
      }
    }

    // 4. Redirect to destination (contextual or homepage)
    // Support Format #2: /a/[code]?redirect=/listings/[id]
    const redirectPath = request.nextUrl.searchParams.get('redirect');
    const redirectUrl = redirectPath
      ? new URL(redirectPath, request.url)
      : new URL('/', request.url);

    console.log('[Referral] Redirecting to:', redirectUrl.pathname);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[Referral] Tracking error:', error);
    return NextResponse.redirect(new URL('/?error=tracking_failed', request.url));
  }
}
