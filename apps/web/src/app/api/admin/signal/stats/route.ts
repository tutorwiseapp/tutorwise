/**
 * Filename: src/app/api/admin/signal/stats/route.ts
 * Purpose: Fetch Revenue Signal overview stats (performance + funnel)
 * Created: 2026-01-16
 * Updated: 2026-01-18 - Migrated from /api/admin/blog/orchestrator (strategic alignment)
 * Updated: 2026-01-18 - RBAC alignment (Migration 189 + 190)
 * Pattern: Admin-only API route with RBAC permission check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC permission check (Migration 190)
    const { data: hasPermission, error: permError } = await supabase
      .rpc('has_admin_permission', {
        p_user_id: user.id,
        p_resource: 'signal',
        p_action: 'view_analytics'
      });

    if (permError) {
      console.error('[Revenue Signal] Permission check error:', permError);
      return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
    }

    if (!hasPermission) {
      return NextResponse.json({
        error: 'Forbidden - Requires signal:view_analytics permission'
      }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const attributionWindow = parseInt(searchParams.get('attributionWindow') || '7');

    // Validate parameters
    if (days < 1 || days > 365) {
      return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 });
    }
    if (![7, 14, 30].includes(attributionWindow)) {
      return NextResponse.json({ error: 'Attribution window must be 7, 14, or 30 days' }, { status: 400 });
    }

    // Call RPCs from Migration 187 (updated to use signal_events)
    const { data: performanceData, error: perfError } = await supabase
      .rpc('get_article_performance_summary', {
        p_days: days,
        p_attribution_window_days: attributionWindow
      });

    const { data: funnelData, error: funnelError } = await supabase
      .rpc('get_conversion_funnel', {
        p_days: days,
        p_attribution_window_days: attributionWindow
      });

    if (perfError) {
      console.error('[Revenue Signal] Performance RPC Error:', perfError);
      return NextResponse.json({ error: 'Failed to fetch performance data', details: perfError }, { status: 500 });
    }

    if (funnelError) {
      console.error('[Revenue Signal] Funnel RPC Error:', funnelError);
      return NextResponse.json({ error: 'Failed to fetch funnel data', details: funnelError }, { status: 500 });
    }

    // Calculate summary stats from performance data
    const summary = {
      total_articles: performanceData?.length || 0,
      total_bookings: performanceData?.reduce((sum: number, row: any) => sum + (row.attributed_bookings || 0), 0) || 0,
      total_revenue: performanceData?.reduce((sum: number, row: any) => sum + parseFloat(row.attributed_revenue || '0'), 0) || 0,
      conversion_rate: 0,
      signal_journeys: performanceData?.reduce((sum: number, row: any) => sum + (row.signal_count || 0), 0) || 0, // NEW from Migration 187
    };

    // Calculate conversion rate (bookings / total views)
    const totalViews = performanceData?.reduce((sum: number, row: any) => sum + (row.total_views || 0), 0) || 0;
    summary.conversion_rate = totalViews > 0 ? (summary.total_bookings / totalViews) * 100 : 0;

    return NextResponse.json({
      performance: performanceData || [],
      funnel: funnelData || [],
      summary,
    });
  } catch (error) {
    console.error('[Revenue Signal] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
