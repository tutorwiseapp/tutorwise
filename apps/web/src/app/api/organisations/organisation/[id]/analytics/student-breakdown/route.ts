/**
 * Filename: src/app/api/organisation/[id]/analytics/student-breakdown/route.ts
 * Purpose: API endpoint for new vs returning student breakdown
 * Created: 2025-12-15
 * Updated: 2025-12-17 - Changed to new/returning breakdown with role-based filtering
 * Version: v7.1 - Role-based analytics filtering
 *
 * GET /api/organisation/[id]/analytics/student-breakdown
 * Returns breakdown of new vs returning students
 * - Owners see organisation-wide student breakdown
 * - Members see their individual student breakdown
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

    // Verify user has access to this organisation and get their role
    const permissions = await verifyOrganisationAccess(organisationId, user.id);

    // Call RPC function to get student breakdown (new vs returning)
    // Owners get org-wide breakdown (null), members get filtered breakdown (their profile_id)
    const { data, error } = await supabase
      .rpc('get_organisation_student_breakdown', {
        org_id: organisationId,
        member_profile_id: permissions.memberProfileId
      })
      .single();

    if (error) {
      console.error('Error fetching student breakdown:', error);
      throw error;
    }

    // Return new vs returning student counts
    const breakdownData = data as { new_students: number; returning_students: number } | null;
    return NextResponse.json({
      new: breakdownData?.new_students || 0,
      returning: breakdownData?.returning_students || 0
    });

  } catch (error) {
    console.error('Student breakdown API error:', error);
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
