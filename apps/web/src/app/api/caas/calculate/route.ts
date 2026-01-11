/**
 * Filename: apps/web/src/app/api/caas/calculate/route.ts
 * Purpose: Immediate CaaS score calculation endpoint for onboarding completion
 * Created: 2026-01-11
 * Pattern: User-Facing API with service_role escalation
 *
 * This endpoint allows authenticated users to trigger immediate CaaS calculation
 * for their own profile. Used during onboarding completion to ensure dashboard
 * shows score immediately instead of waiting for cron worker.
 *
 * Security: Supabase Auth (users can only calculate their own score)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { CaaSService } from '@/lib/services/caas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // ================================================================
    // STEP 1: AUTHENTICATE USER
    // ================================================================
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ================================================================
    // STEP 2: PARSE REQUEST BODY (optional profile_id for admin use)
    // ================================================================
    let targetProfileId = user.id;

    try {
      const body = await request.json();
      // Allow admins to calculate for other users (future feature)
      if (body.profile_id && body.profile_id !== user.id) {
        // For now, only allow users to calculate their own score
        return NextResponse.json(
          { error: 'Cannot calculate score for other users' },
          { status: 403 }
        );
      }
    } catch {
      // No body or invalid JSON - use authenticated user's ID
    }

    // ================================================================
    // STEP 3: CREATE SERVICE_ROLE CLIENT FOR CALCULATION
    // ================================================================
    // CaaS calculation requires service_role to call RPC functions
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ================================================================
    // STEP 4: CALCULATE SCORE IMMEDIATELY
    // ================================================================
    console.log(`[caas/calculate] Calculating score for user ${targetProfileId}`);

    const scoreData = await CaaSService.calculateProfileCaaS(
      targetProfileId,
      serviceSupabase
    );

    console.log(
      `[caas/calculate] ✓ Score calculated: ${scoreData.total}/100 for user ${targetProfileId}`
    );

    // ================================================================
    // STEP 5: RETURN SCORE DATA
    // ================================================================
    return NextResponse.json({
      success: true,
      message: 'CaaS score calculated successfully',
      data: {
        profile_id: targetProfileId,
        total_score: scoreData.total,
        score_breakdown: scoreData.breakdown,
      },
    });
  } catch (error) {
    console.error('[caas/calculate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate CaaS score',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
