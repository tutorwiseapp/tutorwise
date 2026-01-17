/**
 * Filename: apps/web/src/app/api/admin/blog/orchestrator/journey/route.ts
 * Purpose: API endpoint for viewing signal journey (multi-touch attribution visualization)
 * Created: 2026-01-17
 *
 * Calls get_signal_journey() RPC from Migration 187.
 * Shows complete event timeline for a single signal_id journey.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/blog/orchestrator/journey?signal_id=dist_abc123
 *
 * Fetch complete journey for a signal_id
 *
 * Query parameters:
 * - signal_id: Signal ID to trace (required)
 *
 * Response:
 * {
 *   events: SignalEvent[];
 *   metadata: {
 *     signal_id: string;
 *     total_events: number;
 *     journey_duration: string;
 *     is_distribution: boolean;
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin role check
    const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single();

    if (!profile?.roles || !profile.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get signal_id param
    const searchParams = request.nextUrl.searchParams;
    const signalId = searchParams.get('signal_id');

    if (!signalId) {
      return NextResponse.json({ error: 'Missing required parameter: signal_id' }, { status: 400 });
    }

    // Call get_signal_journey RPC from Migration 187
    const { data: journeyEvents, error: journeyError } = await supabase.rpc('get_signal_journey', {
      p_signal_id: signalId,
    });

    if (journeyError) {
      console.error('[Blog Orchestrator] Journey RPC Error:', journeyError);
      return NextResponse.json({ error: 'Failed to fetch journey', details: journeyError }, { status: 500 });
    }

    // Calculate metadata
    const metadata = {
      signal_id: signalId,
      total_events: journeyEvents?.length || 0,
      journey_duration: journeyEvents && journeyEvents.length > 0
        ? journeyEvents[journeyEvents.length - 1].time_since_first
        : null,
      is_distribution: signalId.startsWith('dist_'),
    };

    return NextResponse.json({
      events: journeyEvents || [],
      metadata,
    });
  } catch (error) {
    console.error('[Blog Orchestrator] Journey Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
