/*
 * Filename: src/app/api/referrals/route.ts
 * Purpose: Provides a secure API to fetch the user's referral data, migrated to Kinde.
 * Change History:
 * C003 - 2025-08-31 : 23:30 - Replaced Supabase auth helpers with Kinde's sessionManager.
 * C002 - 2025-07-22 : 22:30 - Added empty export to satisfy TypeScript module requirement.
 * C001 - 2025-07-22 : 21:00 - Initial creation.
 * Last Modified: 2025-08-31 : 23:30
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This is the definitive fix for the build error. The dependency on '@supabase/auth-helpers-nextjs' has been removed. The route now uses Kinde's `sessionManager` for authentication and a standard Supabase admin client for database queries, aligning it with the new architecture.
 */
import { sessionManager } from '@/lib/kinde';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(
        JSON.stringify({ status: 'fail', message: 'User is not authenticated.' }),
        { status: 401 }
      );
    }
    const user = await getUser();
    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('agent_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find a profile for the current user.');
    }
    
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('agent_id', profile.agent_id) 
      .order('created_at', { ascending: false });

    if (referralsError) {
      throw referralsError;
    }
    
    return NextResponse.json(referrals);

  } catch (error) {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(
        JSON.stringify({ status: 'fail', message: errorMessage }),
        { status: 500 }
    );
  }
}