/**
 * Filename: apps/web/src/app/api/calendar/connections/route.ts
 * Purpose: Get user's calendar connections
 * Created: 2026-02-06
 *
 * Returns list of connected calendars (Google/Outlook) for the authenticated user.
 * Tokens are excluded from response for security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { CalendarConnection } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/connections
 * Get user's calendar connections
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Fetch connections
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('profile_id', user.id)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('[Calendar Connections] Fetch error:', error);
      throw error;
    }

    // 3. Remove sensitive tokens from response
    const safeConnections = (connections || []).map((conn: CalendarConnection) => ({
      id: conn.id,
      profile_id: conn.profile_id,
      provider: conn.provider,
      calendar_id: conn.calendar_id,
      email: conn.email,
      sync_enabled: conn.sync_enabled,
      sync_mode: conn.sync_mode,
      status: conn.status,
      last_synced_at: conn.last_synced_at,
      last_error: conn.last_error,
      connected_at: conn.connected_at,
      updated_at: conn.updated_at,
      // Exclude: access_token, refresh_token, token_expiry
    }));

    return NextResponse.json({
      success: true,
      connections: safeConnections,
    });
  } catch (error) {
    console.error('[Calendar Connections] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch connections'
      },
      { status: 500 }
    );
  }
}
