/**
 * Filename: apps/web/src/app/api/admin/signal/attribution/route.ts
 * Purpose: API endpoint for comparing attribution models (First-Touch, Last-Touch, Linear)
 * Created: 2026-01-17
 *
 * Calls get_attribution_comparison() RPC from Migration 187.
 * Shows how different attribution models distribute credit differently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/signal/attribution?days=30
 *
 * Compare attribution models (First-Touch, Last-Touch, Linear)
 *
 * Query parameters:
 * - days: Number of days to look back (default: 30)
 *
 * Response:
 * {
 *   models: AttributionModel[];
 *   insights: {
 *     first_touch_articles: number;
 *     last_touch_articles: number;
 *     linear_articles: number;
 *     total_bookings: number;
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

    // Validate parameters
    if (days < 1 || days > 365) {
      return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 });
    }

    // Call get_attribution_comparison RPC from Migration 187
    const { data: comparisonData, error: comparisonError } = await supabase.rpc('get_attribution_comparison', {
      p_days: days,
    });

    if (comparisonError) {
      console.error('[Revenue Signal] Attribution Comparison RPC Error:', comparisonError);
      return NextResponse.json({ error: 'Failed to fetch attribution comparison', details: comparisonError }, { status: 500 });
    }

    // Calculate insights (how models differ)
    const insights = {
      first_touch_articles: comparisonData?.find((row: any) => row.model_type === 'first_touch')?.attributed_articles || 0,
      last_touch_articles: comparisonData?.find((row: any) => row.model_type === 'last_touch')?.attributed_articles || 0,
      linear_articles: comparisonData?.find((row: any) => row.model_type === 'linear')?.attributed_articles || 0,
      total_bookings: comparisonData?.[0]?.attributed_bookings || 0, // Same across all models
    };

    return NextResponse.json({
      models: comparisonData || [],
      insights,
    });
  } catch (error) {
    console.error('[Revenue Signal] Attribution Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
