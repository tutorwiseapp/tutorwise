/**
 * Filename: src/app/api/organisation/[id]/analytics/revenue-trend/route.ts
 * Purpose: API endpoint for revenue trend chart data
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Performance Analytics
 *
 * GET /api/organisation/[id]/analytics/revenue-trend?weeks=6
 * Returns weekly revenue trend data for line charts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const organisationId = params.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get weeks from query params (default: 6)
    const { searchParams } = new URL(req.url);
    const weeks = parseInt(searchParams.get('weeks') || '6', 10);

    // Verify user owns this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('profile_id')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    if (org.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this organisation' },
        { status: 403 }
      );
    }

    // Call RPC function to get revenue trend
    const { data, error } = await supabase
      .rpc('get_organisation_revenue_trend', {
        org_id: organisationId,
        weeks
      });

    if (error) {
      console.error('Error fetching revenue trend:', error);
      throw error;
    }

    return NextResponse.json({
      data: (data || []).map((row: any) => ({
        week_start: row.week_start,
        week_label: row.week_label,
        total_revenue: Number(row.total_revenue || 0),
        sessions_count: row.sessions_count || 0,
      }))
    });

  } catch (error) {
    console.error('Revenue trend API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
