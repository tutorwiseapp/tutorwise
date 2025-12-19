/**
 * Profile Search by Referral Code API Route
 * Handles searching for profiles by referral code (for commission delegation)
 * Created: 2025-12-18
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get referral code from query params
    const searchParams = request.nextUrl.searchParams;
    const referralCode = searchParams.get('code');

    if (!referralCode || referralCode.trim().length === 0) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Search for profile by referral code (case-insensitive using ILIKE)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code, avatar_url')
      .ilike('referral_code', referralCode)
      .single();

    if (error) {
      console.error('[API] Search by referral code error:', error);

      // Return specific error for "not found" vs other errors
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Referral code not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to search by referral code' },
        { status: 500 }
      );
    }

    // Don't allow users to search for their own referral code
    if (profile.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot delegate commissions to yourself' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { profile },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[API] Search by referral code exception:', error);
    return NextResponse.json(
      { error: 'Failed to search by referral code' },
      { status: 500 }
    );
  }
}
