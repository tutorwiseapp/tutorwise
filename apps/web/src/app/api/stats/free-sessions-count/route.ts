/**
 * Filename: route.ts
 * Path: /api/stats/free-sessions-count
 * Purpose: Get count of completed free help sessions for a tutor (v5.9)
 * Created: 2025-11-16
 *
 * This is a public endpoint that returns how many free sessions a tutor has completed.
 * Used to display the "Community Tutor" badge and stats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Count completed free help sessions for this tutor
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', profileId)
      .eq('type', 'free_help')
      .eq('status', 'Completed');

    if (error) {
      console.error('Failed to count free sessions:', error);
      return NextResponse.json(
        { error: 'Failed to count free sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('[Free Sessions Count] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
