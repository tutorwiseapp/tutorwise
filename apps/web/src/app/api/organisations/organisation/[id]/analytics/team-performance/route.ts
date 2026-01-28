/**
 * Filename: src/app/api/organisation/[id]/analytics/team-performance/route.ts
 * Purpose: API endpoint for team member performance comparison
 * Created: 2025-12-15
 * Updated: 2025-12-17 - Added role-based filtering and top N limiting
 * Version: v7.2 - Role-based analytics with performance optimization
 *
 * GET /api/organisation/[id]/analytics/team-performance?period=month&limit=5
 * Returns performance metrics for team members
 * - Owners/admins see top N members (default 5, configurable via limit param)
 * - Members see only their own performance
 * - Response includes isOwnerOrAdmin flag and totalMembers count
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
    const limit = parseInt(searchParams.get('limit') || '5', 10); // Default to top 5

    // Verify user has access to this organisation and get their role
    const permissions = await verifyOrganisationAccess(organisationId, user.id);

    // Call RPC function to get team performance
    // Owners/admins see top N members (null), members see only themselves (their profile_id)
    const { data, error } = await supabase
      .rpc('get_team_performance', {
        org_id: organisationId,
        period,
        member_profile_id: permissions.memberProfileId
      });

    if (error) {
      console.error('Error fetching team performance:', error);
      throw error;
    }

    // Limit results for owners/admins (top performers), no limit for members (they only see themselves)
    const limitedData = permissions.memberProfileId ? data : (data || []).slice(0, limit);

    return NextResponse.json({
      data: (limitedData || []).map((row: any) => ({
        member_id: row.member_id,
        member_name: row.member_name,
        member_email: row.member_email,
        member_avatar_url: row.member_avatar_url,
        total_revenue: Number(row.total_revenue || 0),
        sessions_count: row.sessions_count || 0,
        active_students_count: row.active_students_count || 0,
        avg_rating: Number(row.avg_rating || 0),
        last_session_at: row.last_session_at,
      })),
      isOwnerOrAdmin: !permissions.memberProfileId, // Include role info for dynamic titles
      totalMembers: (data || []).length, // Total count before limiting
    });

  } catch (error) {
    console.error('Team performance API error:', error);
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
