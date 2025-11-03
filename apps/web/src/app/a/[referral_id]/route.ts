/*
 * Filename: src/app/a/[referral_id]/route.ts
 * Purpose: Handles referral link clicks, creates lead-gen record, sets cookie (SDD v3.6)
 * Created: 2025-11-02 (Updated from legacy)
 * Specification: SDD v3.6, Section 8.1
 * Change Summary: Updated to create referral records in new schema and set httpOnly cookie
 */
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /a/[referral_id]
 * Tracks referral click and redirects to homepage
 * - For logged-in users: Creates 'Referred' record with referred_profile_id
 * - For anonymous users: Creates 'Referred' record without referred_profile_id, sets cookie
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { referral_id: string } }
) {
  const { referral_id } = params;
  const supabase = createClient();

  try {
    // 1. Get referrer's profile_id from their referral_code
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referral_id.toUpperCase())
      .single();

    if (referrerError || !referrerProfile) {
      console.error('Invalid referral code:', referral_id);
      return NextResponse.redirect(new URL('/?error=invalid_referral', request.url));
    }

    const referrer_profile_id = referrerProfile.id;

    // 2. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Create referral record (SDD v3.6, Section 8.1)
    if (user) {
      // REGISTERED USER FUNNEL
      // Create referral record with referred_profile_id
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_profile_id,
          referred_profile_id: user.id,
          status: 'Referred'
        });

      if (referralError) {
        console.error('Error creating referral for logged-in user:', referralError);
      }
    } else {
      // UNREGISTERED USER FUNNEL
      // Create anonymous referral record and store ID in cookie
      const { data: referralRecord, error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_profile_id,
          referred_profile_id: null,
          status: 'Referred'
        })
        .select('id')
        .single();

      if (referralError || !referralRecord) {
        console.error('Error creating anonymous referral:', referralError);
      } else {
        // Set secure, httpOnly cookie (SDD v3.6, Q&A #4)
        const cookieStore = cookies();
        cookieStore.set('tutorwise_referral_id', referralRecord.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        });
      }
    }

    // 4. Redirect to homepage
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('Referral tracking error:', error);
    return NextResponse.redirect(new URL('/?error=tracking_failed', request.url));
  }
}
