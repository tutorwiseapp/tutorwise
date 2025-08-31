/*
 * Filename: src/app/api/activity/route.ts
 * Purpose: Provides a secure API to fetch the authenticated user's activity, migrated to Kinde.
 * Change History:
 * C002 - 2025-08-31 : 23:30 - Replaced Supabase auth helpers with Kinde's sessionManager.
 * C001 - [Date] : [Time] - Initial creation.
 * Last Modified: 2025-08-31 : 23:30
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This is the definitive fix for the build error. The dependency on '@supabase/auth-helpers-nextjs' has been removed. The route now uses Kinde's `sessionManager` for authentication and a standard Supabase admin client for the database query, aligning it with the new architecture.
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
    
    // NOTE: This logic assumes the Kinde user ID is the same as the agent_id in ClickLog.
    // A more robust implementation might first look up the agent_id from the 'profiles' table.
    const { data: clickLogs, error } = await supabaseAdmin
      .from('ClickLog')
      .select('*')
      .eq('agent_id', user.id) 
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    
    return NextResponse.json(clickLogs);

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