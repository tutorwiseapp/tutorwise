/*
 * Filename: src/app/api/referrals/route.ts
 * Purpose: Provides a secure, server-side API endpoint to fetch the authenticated user's referral data.
 *
 * Change History:
 * C002 - 2025-07-22 : 22:30 - Added empty export to satisfy TypeScript module requirement.
 * C001 - 2025-07-22 : 21:00 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 22:30
 * Requirement ID (optional): VIN-C-01.1
 *
 * Change Summary:
 * An empty `export {}` has been added to the end of the file. This is a standard convention to
 * ensure TypeScript treats the file as a module, resolving the "is not a module" build error
 * that can occur in files that only contain ambient declarations or side effects.
 *
 * Impact Analysis:
 * This change fixes a critical deployment blocker.
 *
 * Dependencies: "next/server", "@supabase/auth-helpers-nextjs".
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 1. Get the current user's session from the cookie
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(
        JSON.stringify({ status: 'fail', message: 'User is not authenticated.' }),
        { status: 401 }
      );
    }
    
    // 2. Get the user's profile to find their public agent_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agent_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find a profile for the current user.');
    }
    
    // 3. Fetch all referrals that match the user's agent_id
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('agent_id', profile.agent_id) 
      .order('created_at', { ascending: false });

    if (referralsError) {
      throw referralsError;
    }
    
    // 4. Return the data successfully
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

// Adding an empty export ensures this file is treated as a module.
export {};