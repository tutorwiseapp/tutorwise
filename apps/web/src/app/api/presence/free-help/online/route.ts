/**
 * Filename: route.ts
 * Path: /api/presence/free-help/online
 * Purpose: Set tutor as available for free help (v5.9)
 * Created: 2025-11-16
 *
 * This endpoint is called when a tutor toggles ON the "Offer Free Help" switch.
 * It creates a Redis key with 5-minute TTL and updates the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { setTutorOnline } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createRouteHandlerClient({ cookies });
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

    // 2. Verify user is a tutor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'tutor') {
      return NextResponse.json(
        { error: 'Only tutors can offer free help' },
        { status: 403 }
      );
    }

    // 3. Set tutor online in Redis (5-minute TTL)
    await setTutorOnline(user.id);

    // 4. Update database flag for marketplace queries
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ available_free_help: true })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Failed to update profile:', updateProfileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // 5. Update caas_scores for fast marketplace sorting
    const { error: updateCaasError } = await supabase
      .from('caas_scores')
      .update({ available_free_help: true })
      .eq('profile_id', user.id);

    if (updateCaasError) {
      console.error('Failed to update caas_scores:', updateCaasError);
      // Non-fatal: profile update succeeded, so continue
    }

    console.log(`[Free Help] Tutor ${user.id} is now ONLINE for free help`);

    return NextResponse.json({
      success: true,
      status: 'online',
      message: 'You are now offering free help',
    });
  } catch (error) {
    console.error('[Free Help Online] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
