/**
 * Filename: referral-tracking.ts
 * Purpose: Middleware to capture and store referral codes in cookies
 * Created: 2025-12-31
 */

import { NextRequest, NextResponse } from 'next/server';

const REFERRAL_COOKIE_NAME = 'tutorwise_referral';
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Capture referral code from URL and store in cookie
 * Supports both individual referrals (/a/{code}) and org member referrals (/join/{slug}?ref={code})
 */
export function handleReferralTracking(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const { searchParams, pathname } = request.nextUrl;

  // Check for org member referral (/join/{slug}?ref={code})
  const orgReferralCode = searchParams.get('ref');
  if (orgReferralCode && pathname.startsWith('/join/')) {
    // Extract organisation slug from path
    const orgSlug = pathname.split('/join/')[1]?.split('/')[0];

    if (orgSlug) {
      // Store referral data as JSON
      const referralData = JSON.stringify({
        type: 'org_member',
        code: orgReferralCode,
        organisationSlug: orgSlug,
        timestamp: new Date().toISOString(),
      });

      response.cookies.set(REFERRAL_COOKIE_NAME, referralData, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  // Check for individual referral (/a/{code})
  if (pathname.startsWith('/a/')) {
    const individualCode = pathname.split('/a/')[1]?.split('/')[0];

    if (individualCode) {
      const referralData = JSON.stringify({
        type: 'individual',
        code: individualCode,
        timestamp: new Date().toISOString(),
      });

      response.cookies.set(REFERRAL_COOKIE_NAME, referralData, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  return response;
}

/**
 * Get stored referral data from cookie
 */
export function getReferralData(request: NextRequest): {
  type: 'org_member' | 'individual';
  code: string;
  organisationSlug?: string;
  timestamp: string;
} | null {
  const referralCookie = request.cookies.get(REFERRAL_COOKIE_NAME);

  if (!referralCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(referralCookie.value);
  } catch (error) {
    console.error('Error parsing referral cookie:', error);
    return null;
  }
}

/**
 * Clear referral cookie (after successful attribution)
 */
export function clearReferralData(response: NextResponse): void {
  response.cookies.delete(REFERRAL_COOKIE_NAME);
}
