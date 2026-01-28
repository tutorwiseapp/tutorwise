/**
 * Filename: src/utils/referral/context.ts
 * Purpose: Helper functions to pass referral context to Supabase Auth signup
 * Created: 2025-12-16
 * Patent Reference: Section 3 (Hierarchical Attribution Resolution)
 * Migration: 091_hierarchical_attribution_enhancement.sql
 *
 * These utilities extract referral context from cookies and pass it to the
 * handle_new_user() trigger via auth.users.raw_user_meta_data for hierarchical
 * attribution resolution (URL → Cookie → Manual).
 */

import { cookies } from 'next/headers';

/**
 * Extract referral context from request cookies
 * Returns signed cookie value and secret for HMAC validation in trigger
 */
export async function getReferralContext(): Promise<{
  referral_cookie_id?: string;
  referral_cookie_secret?: string;
}> {
  const cookieStore = await cookies();
  const referralCookie = cookieStore.get('tutorwise_referral_id');

  if (!referralCookie?.value) {
    return {};
  }

  const secret = process.env.REFERRAL_COOKIE_SECRET;

  return {
    referral_cookie_id: referralCookie.value, // Signed value: "uuid.signature"
    referral_cookie_secret: secret, // Secret for HMAC validation
  };
}

/**
 * Build user metadata for Supabase Auth signup
 * Combines user data with referral context for hierarchical attribution
 *
 * Usage:
 * ```typescript
 * const metadata = await buildSignupMetadata({
 *   full_name: 'John Doe',
 *   referral_code_manual: 'ABC123' // Optional manual entry
 * });
 *
 * await supabase.auth.signUp({
 *   email,
 *   password,
 *   options: { data: metadata }
 * });
 * ```
 */
export async function buildSignupMetadata(userData: {
  full_name?: string;
  avatar_url?: string;
  referral_code_manual?: string;
  referral_code_url?: string;
}): Promise<Record<string, any>> {
  const referralContext = await getReferralContext();

  return {
    ...userData,
    ...referralContext,
  };
}

/**
 * Check if user has a pending referral attribution
 * (Used to show referrer info on signup page)
 */
export async function hasPendingReferral(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get('tutorwise_referral_id');
}
