import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/process-studio/discovery/scans
 *
 * Returns recent scan history from `workflow_discovery_scans`.
 * Used by the DiscoveryPanel to show the last scan timestamp and stats.
 * Limited to the 10 most recent scans.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data: scans, error: fetchError } = await supabase
      .from('workflow_discovery_scans')
      .select('id, source_types, status, results_count, duration_ms, started_at, completed_at')
      .order('started_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('Failed to fetch scan history:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch scan history', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { scans: scans ?? [] },
    });
  } catch (error) {
    console.error('Scans history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scan history',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
