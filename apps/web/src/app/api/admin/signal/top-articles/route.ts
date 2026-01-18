/*
 * Filename: src/app/api/admin/signal/top-articles/route.ts
 * Purpose: Fetch top-performing articles sorted by revenue
 * Created: 2026-01-16
 * Updated: 2026-01-18 - RBAC alignment (Migration 190)
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

    // Call RPC and sort by revenue descending
    const { data: performanceData, error: perfError } = await supabase
      .rpc('get_article_performance_summary', {
        p_days: days,
        p_attribution_window_days: attributionWindow
      });

    if (perfError) {
      console.error('[Revenue Signal] Performance RPC Error:', perfError);
      return NextResponse.json({ error: 'Failed to fetch article performance' }, { status: 500 });
    }

    // Sort by revenue descending (client-side since RPC doesn't do this)
    const sortedArticles = (performanceData || []).sort((a: any, b: any) =>
      (b.booking_revenue || 0) - (a.booking_revenue || 0)
    );

    return NextResponse.json({
      articles: sortedArticles,
    });
  } catch (error) {
    console.error('[Revenue Signal] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
