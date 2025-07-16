// app/api/activity/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(
        JSON.stringify({ status: 'fail', message: 'User is not authenticated.' }),
        { status: 401 }
      );
    }
    
    // The agent_id in ClickLog must match the user's Supabase Auth ID.
    const { data: clickLogs, error } = await supabase
      .from('ClickLog')
      .select('*')
      .eq('agent_id', session.user.id) 
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    
    return NextResponse.json(clickLogs);

  } catch (error) {
    // Correctly handle the error type to satisfy TypeScript
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