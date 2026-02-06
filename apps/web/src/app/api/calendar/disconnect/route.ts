/**
 * Filename: apps/web/src/app/api/calendar/disconnect/route.ts
 * Purpose: Disconnect calendar integration
 * Created: 2026-02-06
 *
 * Removes calendar connection and all synced events from database.
 * Note: Events remain in external calendar (Google/Outlook) but won't sync anymore.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface DisconnectBody {
  provider: 'google' | 'outlook';
}

/**
 * POST /api/calendar/disconnect
 * Disconnect a calendar integration
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    const body: DisconnectBody = await request.json();
    const { provider } = body;

    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // 3. Delete connection (calendar_events will cascade delete via ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('profile_id', user.id)
      .eq('provider', provider);

    if (deleteError) {
      console.error('[Calendar Disconnect] Delete error:', deleteError);
      throw deleteError;
    }

    console.log(`[Calendar Disconnect] ✅ ${provider} calendar disconnected for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar disconnected successfully`
    });
  } catch (error) {
    console.error('[Calendar Disconnect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect calendar'
      },
      { status: 500 }
    );
  }
}
