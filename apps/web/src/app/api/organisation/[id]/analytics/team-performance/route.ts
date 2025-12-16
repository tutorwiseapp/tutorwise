/**
 * Filename: src/app/api/organisation/[id]/analytics/team-performance/route.ts
 * Purpose: API endpoint for team member performance comparison
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Performance Analytics
 *
 * GET /api/organisation/[id]/analytics/team-performance?period=month
 * Returns performance metrics for all team members
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

    // Call RPC function to get team performance
    const { data, error } = await supabase
      .rpc('get_team_performance', {
        org_id: organisationId,
        period
      });

    if (error) {
      console.error('Error fetching team performance:', error);
      throw error;
    }

    return NextResponse.json({
      data: (data || []).map((row: any) => ({
        member_id: row.member_id,
        member_name: row.member_name,
        member_email: row.member_email,
        member_avatar_url: row.member_avatar_url,
        total_revenue: Number(row.total_revenue || 0),
        sessions_count: row.sessions_count || 0,
        active_students_count: row.active_students_count || 0,
        avg_rating: Number(row.avg_rating || 0),
        last_session_at: row.last_session_at,
      }))
    });

  } catch (error) {
    console.error('Team performance API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
