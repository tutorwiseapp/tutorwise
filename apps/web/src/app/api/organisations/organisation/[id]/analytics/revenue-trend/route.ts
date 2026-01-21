/**
 * Filename: src/app/api/organisation/[id]/analytics/revenue-trend/route.ts
 * Purpose: API endpoint for revenue trend chart data
 * Created: 2025-12-15
 * Updated: 2025-12-17 - Added role-based filtering
 * Version: v7.1 - Role-based analytics filtering
 *
 * GET /api/organisation/[id]/analytics/revenue-trend?weeks=6
 * Returns weekly revenue trend data for line charts
 * - Owners see full organisation revenue trend
 * - Members see their individual revenue trend within the organisation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyOrganisationAccess } from '../_utils/permissions';

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

    // Verify user has access to this organisation and get their role
    const permissions = await verifyOrganisationAccess(organisationId, user.id);

    // Call RPC function to get revenue trend
    // Owners get org-wide trend (null), members get filtered trend (their profile_id)
    const { data, error } = await supabase
      .rpc('get_organisation_revenue_trend', {
        org_id: organisationId,
        weeks,
        member_profile_id: permissions.memberProfileId
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
