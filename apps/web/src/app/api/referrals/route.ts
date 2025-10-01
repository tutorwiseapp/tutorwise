/*
 * Filename: src/app/api/referrals/route.ts
 * Purpose: Provides a secure API to fetch the user's referral data.
 * Change History:
 * C004 - 2025-09-02 : 19:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-02 : 19:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This route has been fully migrated to Supabase Auth. It now uses the `createClient` from `@/utils/supabase/server` to securely get the user's session from their cookie.
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ status: 'fail', message: 'User is not authenticated.' }),
        { status: 401 }
      );
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agent_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find a profile for the current user.');
    }
    
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('agent_id', profile.agent_id) 
      .order('created_at', { ascending: false });

    if (referralsError) {
      throw referralsError;
    }
    
    return NextResponse.json(referrals);

  } catch (error) {
    return new NextResponse(
        JSON.stringify({ status: 'fail', message: (error as Error).message }),
        { status: 500 }
    );
  }
}