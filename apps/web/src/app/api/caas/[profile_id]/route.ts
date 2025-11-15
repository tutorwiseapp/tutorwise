/**
 * Filename: apps/web/src/app/api/caas/[profile_id]/route.ts
 * Purpose: Get CaaS score for a profile (Pattern 1 - User-Facing API) v5.5
 * Created: 2025-11-15
 * Pattern: Pattern 1 (User-Facing API) - API Solution Design v5.1
 *
 * This endpoint allows users to fetch cached CaaS scores from the caas_scores table.
 * Used by frontend components to display credibility scores.
 *
 * Security: Supabase Auth + RLS (public can view TUTOR scores, users can view own)
 * Response: { total_score, score_breakdown, role_type, calculated_at }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    profile_id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile_id } = params;

    // ================================================================
    // STEP 1: VALIDATE PROFILE_ID
    // ================================================================
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profile_id)) {
      return NextResponse.json(
        { error: 'Invalid profile_id format' },
        { status: 400 }
      );
    }

    // ================================================================
    // STEP 2: CREATE SUPABASE CLIENT (USER SESSION)
    // ================================================================
    // Uses user's session token - RLS policies will enforce access control
    const supabase = await createClient();

    // ================================================================
    // STEP 3: FETCH SCORE FROM CACHE
    // ================================================================
    const { data: score, error } = await supabase
      .from('caas_scores')
      .select('total_score, score_breakdown, role_type, calculated_at, calculation_version')
      .eq('profile_id', profile_id)
      .single();

    if (error) {
      // PGRST116 = No rows found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Score not found',
            message: 'CaaS score has not been calculated for this profile yet',
          },
          { status: 404 }
        );
      }

      // RLS policy violation or other DB error
      console.error('[caas/[profile_id]] Error fetching score:', error);
      return NextResponse.json(
        { error: 'Failed to fetch score', details: error.message },
        { status: 500 }
      );
    }

    // ================================================================
    // STEP 4: RETURN SCORE DATA
    // ================================================================
    return NextResponse.json({
      success: true,
      data: {
        profile_id,
        total_score: score.total_score,
        score_breakdown: score.score_breakdown,
        role_type: score.role_type,
        calculated_at: score.calculated_at,
        calculation_version: score.calculation_version,
      },
    });
  } catch (error) {
    console.error('[caas/[profile_id]] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
