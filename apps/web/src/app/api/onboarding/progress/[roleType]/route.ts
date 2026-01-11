// apps/web/src/app/api/onboarding/progress/[roleType]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { OnboardingProgressResponse } from '@/types';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/progress/[roleType]
 * Retrieve saved onboarding progress for a specific role (tutor, client, agent)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { roleType: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roleType } = params;

    // Validate roleType
    if (!['tutor', 'client', 'agent'].includes(roleType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role type. Must be tutor, client, or agent.' },
        { status: 400 }
      );
    }

    // Fetch onboarding progress from profiles table
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('onboarding_progress')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[GET /api/onboarding/progress] Error fetching progress:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    // If no onboarding_progress exists, return 404
    if (!profile?.onboarding_progress) {
      return NextResponse.json(
        { success: false, error: 'No onboarding progress found' },
        { status: 404 }
      );
    }

    const response: OnboardingProgressResponse = {
      success: true,
      progress: profile.onboarding_progress,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[GET /api/onboarding/progress] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/onboarding/progress/[roleType]
 * Delete onboarding progress for a specific role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleType: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roleType } = params;

    // Validate roleType
    if (!['tutor', 'client', 'agent'].includes(roleType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role type. Must be tutor, client, or agent.' },
        { status: 400 }
      );
    }

    // Fetch current progress
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('onboarding_progress')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[DELETE /api/onboarding/progress] Error fetching progress:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const existingProgress = profile?.onboarding_progress || {};

    // Remove the specific role's progress
    const updatedProgress = {
      ...existingProgress,
      [roleType]: undefined,
      last_updated: new Date().toISOString(),
    };

    // Update database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_progress: updatedProgress })
      .eq('id', user.id);

    if (updateError) {
      console.error('[DELETE /api/onboarding/progress] Error updating progress:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete progress' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: `${roleType} onboarding progress deleted successfully` },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DELETE /api/onboarding/progress] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
