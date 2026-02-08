/**
 * Filename: apps/web/src/app/api/network/metrics/route.ts
 * Purpose: Get network connection metrics for dashboard widget
 * Created: 2026-02-08
 * Network Audit Enhancement: Dashboard analytics endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connections for the user (SOCIAL relationships)
    const { data: connections, error: connectionsError } = await supabase
      .from('profile_graph')
      .select('id, status, created_at, source_profile_id, target_profile_id')
      .eq('relationship_type', 'SOCIAL')
      .or(`source_profile_id.eq.${user.id},target_profile_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (connectionsError) {
      console.error('[network/metrics] Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    // Calculate metrics
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalConnections = connections?.filter(c => c.status === 'ACTIVE').length || 0;

    const pendingReceived = connections?.filter(
      c => c.status === 'PENDING' && c.target_profile_id === user.id
    ).length || 0;

    const pendingSent = connections?.filter(
      c => c.status === 'PENDING' && c.source_profile_id === user.id
    ).length || 0;

    // Calculate weekly growth (new ACTIVE connections in the last 7 days)
    const weeklyGrowth = connections?.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      const createdAt = new Date(c.created_at);
      return createdAt >= oneWeekAgo;
    }).length || 0;

    // Calculate growth percentage
    const previousTotal = totalConnections - weeklyGrowth;
    const weeklyGrowthPercent = previousTotal > 0
      ? (weeklyGrowth / previousTotal) * 100
      : weeklyGrowth > 0 ? 100 : 0;

    return NextResponse.json({
      totalConnections,
      pendingReceived,
      pendingSent,
      weeklyGrowth,
      weeklyGrowthPercent,
    });

  } catch (error) {
    console.error('[network/metrics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
