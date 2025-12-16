/**
 * Filename: src/app/api/organisation/[id]/analytics/student-breakdown/route.ts
 * Purpose: API endpoint for student distribution by subject
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Performance Analytics
 *
 * GET /api/organisation/[id]/analytics/student-breakdown
 * Returns student distribution across subjects/categories
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

    // Call RPC function to get student breakdown
    const { data, error } = await supabase
      .rpc('get_organisation_student_breakdown', {
        org_id: organisationId
      });

    if (error) {
      console.error('Error fetching student breakdown:', error);
      throw error;
    }

    return NextResponse.json({
      data: (data || []).map((row: any) => ({
        subject: row.subject,
        student_count: row.student_count || 0,
        revenue: Number(row.revenue || 0),
      }))
    });

  } catch (error) {
    console.error('Student breakdown API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
