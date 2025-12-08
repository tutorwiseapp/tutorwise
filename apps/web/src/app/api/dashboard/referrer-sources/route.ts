/**
 * Filename: apps/web/src/app/api/dashboard/referrer-sources/route.ts
 * Purpose: Fetch referrer sources breakdown for analytics dashboard
 * Created: 2025-12-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch referrer sources with counts
    const { data: referrerData, error: referrerError } = await supabase
      .from('profile_views')
      .select('referrer_source')
      .eq('profile_id', user.id);

    if (referrerError) throw referrerError;

    // Group by referrer source
    const sourceCount: { [key: string]: number } = {};

    referrerData?.forEach((view) => {
      const source = view.referrer_source || 'direct';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    // Convert to array and sort by count
    const sources = Object.entries(sourceCount)
      .map(([source, count]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1), // Capitalize
        count
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching referrer sources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
