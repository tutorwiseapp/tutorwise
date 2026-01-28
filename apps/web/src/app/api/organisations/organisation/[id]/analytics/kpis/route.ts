/**
 * Filename: src/app/api/organisation/[id]/analytics/kpis/route.ts
 * Purpose: API endpoint for organisation-level KPI metrics
 * Created: 2025-12-15
 * Updated: 2025-12-17 - Added role-based filtering
 * Version: v7.1 - Role-based analytics filtering
 *
 * GET /api/organisation/[id]/analytics/kpis?period=month
 * Returns organisation KPIs with period-over-period comparison
 * - Owners see full organisation metrics
 * - Members see their individual contribution to org metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyOrganisationAccess } from '../_utils/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Verify user has access to this organisation and get their role
    const permissions = await verifyOrganisationAccess(organisationId, user.id);

    // Call RPC function to get KPIs
    // Owners get org-wide metrics (null), members get filtered metrics (their profile_id)
    const { data, error } = await supabase
      .rpc('get_organisation_kpis', {
        org_id: organisationId,
        period,
        member_profile_id: permissions.memberProfileId
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    // Return appropriate status code based on error type
    const status =
      errorMessage.includes('not found') ? 404 :
      errorMessage.includes('not have access') || errorMessage.includes('not a member') ? 403 :
      500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
