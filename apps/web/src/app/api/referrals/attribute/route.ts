/**
 * Filename: /api/referrals/attribute/route.ts
 * Purpose: Attribute booking to referral and create referral record
 * Created: 2025-12-31
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const REFERRAL_COOKIE_NAME = 'tutorwise_referral';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Get referral data from cookie
    const referralCookie = cookieStore.get(REFERRAL_COOKIE_NAME);

    if (!referralCookie?.value) {
      // No referral tracking - this is fine, not all bookings are referrals
      return NextResponse.json({ success: true, referral: null });
    }

    let referralData;
    try {
      referralData = JSON.parse(referralCookie.value);
    } catch (error) {
      console.error('Error parsing referral cookie:', error);
      return NextResponse.json({ error: 'Invalid referral data' }, { status: 400 });
    }

    // Handle different referral types
    if (referralData.type === 'org_member') {
      // Organisation member referral
      const { code, organisationSlug } = referralData;

      // Find the referrer member by their referral code
      const { data: referrerProfile, error: referrerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .single();

      if (referrerError || !referrerProfile) {
        console.error('Referrer not found:', referrerError);
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }

      // Find the organisation by slug
      const { data: organisation, error: orgError } = await supabase
        .from('connection_groups')
        .select('id')
        .eq('slug', organisationSlug)
        .single();

      if (orgError || !organisation) {
        console.error('Organisation not found:', orgError);
        return NextResponse.json({ error: 'Invalid organisation' }, { status: 400 });
      }

      // Create referral record
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_profile_id: referrerProfile.id,
          referred_profile_id: user.id,
          organisation_id: organisation.id,
          referrer_member_id: referrerProfile.id,
          booking_id: bookingId,
          status: 'Signed Up',
          referral_source: `org_member:${organisationSlug}`,
        })
        .select()
        .single();

      if (referralError) {
        console.error('Error creating referral:', referralError);
        return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
      }

      // Clear referral cookie after successful attribution
      const response = NextResponse.json({ success: true, referral });
      response.cookies.delete(REFERRAL_COOKIE_NAME);
      return response;
    } else if (referralData.type === 'individual') {
      // Individual referral (existing system)
      const { code } = referralData;

      // Find referrer by code
      const { data: referrerProfile, error: referrerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .single();

      if (referrerError || !referrerProfile) {
        console.error('Referrer not found:', referrerError);
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }

      // Create individual referral record
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_profile_id: referrerProfile.id,
          referred_profile_id: user.id,
          booking_id: bookingId,
          status: 'Signed Up',
          referral_source: 'individual',
        })
        .select()
        .single();

      if (referralError) {
        console.error('Error creating referral:', referralError);
        return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
      }

      // Clear referral cookie
      const response = NextResponse.json({ success: true, referral });
      response.cookies.delete(REFERRAL_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ error: 'Unknown referral type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in referral attribution:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
