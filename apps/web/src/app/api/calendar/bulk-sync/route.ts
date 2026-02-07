/**
 * Filename: apps/web/src/app/api/calendar/bulk-sync/route.ts
 * Purpose: API endpoint to trigger and monitor bulk sync progress
 * Created: 2026-02-07
 *
 * Allows frontend to initiate bulk sync with progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { bulkSyncExistingBookings } from '@/lib/calendar/bulk-sync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calendar/bulk-sync
 * Trigger bulk sync for a user's existing bookings
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user has calendar connected
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('provider')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No calendar connected' },
        { status: 400 }
      );
    }

    // 3. Perform bulk sync
    const result = await bulkSyncExistingBookings(user.id);

    return NextResponse.json({
      success: true,
      result: {
        total: result.total,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[Bulk Sync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk sync failed',
      },
      { status: 500 }
    );
  }
}
