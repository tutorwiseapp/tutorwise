/**
 * Filename: src/app/api/organisation/[id]/analytics/kpis/route.ts
 * Purpose: API endpoint for organisation-level KPI metrics
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Performance Analytics
 *
 * GET /api/organisation/[id]/analytics/kpis?period=month
 * Returns organisation KPIs with period-over-period comparison
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

    // Get period from query params (default: month)
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';

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

    // Call RPC function to get KPIs
    const { data, error } = await supabase
      .rpc('get_organisation_kpis', {
        org_id: organisationId,
        period
      })
      .single();

    if (error) {
      console.error('Error fetching organisation KPIs:', error);
      throw error;
    }

    const kpiData = data as any;
    return NextResponse.json({
      total_revenue: Number(kpiData.total_revenue || 0),
      revenue_change_pct: Number(kpiData.revenue_change_pct || 0),
      active_students: kpiData.active_students || 0,
      students_change_pct: Number(kpiData.students_change_pct || 0),
      avg_session_rating: Number(kpiData.avg_session_rating || 0),
      team_utilization_rate: Number(kpiData.team_utilization_rate || 0),
      total_sessions: kpiData.total_sessions || 0,
      sessions_change_pct: Number(kpiData.sessions_change_pct || 0),
    });

  } catch (error) {
    console.error('KPIs API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
