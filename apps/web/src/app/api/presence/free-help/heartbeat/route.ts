/**
 * Filename: route.ts
 * Path: /api/presence/free-help/heartbeat
 * Purpose: Refresh tutor's free help presence heartbeat (v5.9)
 * Created: 2025-11-16
 * Updated: 2025-11-16 - Fixed deprecated Supabase client
 *
 * This endpoint is called every 4 minutes by active client devices to refresh
 * the 5-minute TTL on the Redis key. If the key doesn't exist, it means the
 * tutor went offline and this returns an error, triggering the client to update UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { refreshTutorHeartbeat } from '@/lib/redis';

export async function POST(_req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Attempt to refresh the heartbeat
    const wasRefreshed = await refreshTutorHeartbeat(user.id);

    if (!wasRefreshed) {
      // Key doesn't exist - tutor is not actually online
      // This can happen if:
      // - TTL expired (no heartbeat for 5 minutes)
      // - Tutor manually went offline on another device
      // - Redis key was cleared
      console.log(`[Free Help] Heartbeat failed for ${user.id} - key doesn't exist`);

      return NextResponse.json(
        {
          success: false,
          status: 'offline',
          message: 'Presence expired - please toggle back online',
        },
        { status: 410 } // 410 Gone - resource no longer available
      );
    }

    // 3. Heartbeat successful - TTL refreshed to 5 minutes
    return NextResponse.json({
      success: true,
      status: 'online',
      message: 'Heartbeat refreshed',
    });
  } catch (error) {
    console.error('[Free Help Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
