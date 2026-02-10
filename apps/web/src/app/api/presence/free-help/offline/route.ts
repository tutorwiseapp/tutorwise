/**
 * Filename: route.ts
 * Path: /api/presence/free-help/offline
 * Purpose: Set tutor as unavailable for free help (v5.9)
 * Created: 2025-11-16
 * Updated: 2025-11-16 - Fixed deprecated Supabase client
 *
 * This endpoint is called when a tutor toggles OFF the "Offer Free Help" switch
 * or when they want to manually go offline. It deletes the Redis key and updates the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { setTutorOffline } from '@/lib/redis';

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

    // 2. Delete Redis key immediately - gracefully handle if Redis not configured
    try {
      await setTutorOffline(user.id);
    } catch (error) {
      console.warn('[Free Help] Redis not configured, using database-only mode:', error);
    }

    // 3. Update database flag
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ available_free_help: false })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Failed to update profile:', updateProfileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // 4. Update caas_scores
    const { error: updateCaasError } = await supabase
      .from('caas_scores')
      .update({ available_free_help: false })
      .eq('profile_id', user.id);

    if (updateCaasError) {
      console.error('Failed to update caas_scores:', updateCaasError);
      // Non-fatal: profile update succeeded, so continue
    }

    console.log(`[Free Help] Tutor ${user.id} is now OFFLINE for free help`);

    return NextResponse.json({
      success: true,
      status: 'offline',
      message: 'You are no longer offering free help',
    });
  } catch (error) {
    console.error('[Free Help Offline] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
