// apps/web/src/app/api/save-onboarding-progress/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SaveProgressPayload, OnboardingProgressResponse } from '@/types';

/**
 * API route to save user onboarding progress
 * This endpoint performs a deep merge of onboarding progress to prevent data loss
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const payload: SaveProgressPayload = await request.json();

    if (!payload.userId || payload.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Fetch current onboarding progress
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('onboarding_progress')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current progress:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current progress' },
        { status: 500 }
      );
    }

    // Deep merge: combine existing progress with new progress
    const existingProgress = currentProfile?.onboarding_progress || {};
    const mergedProgress = {
      ...existingProgress,
      ...payload.progress,
      // Merge role-specific progress deeply
      seeker: {
        ...existingProgress.seeker,
        ...payload.progress.seeker,
      },
      provider: {
        ...existingProgress.provider,
        ...payload.progress.provider,
      },
      agent: {
        ...existingProgress.agent,
        ...payload.progress.agent,
      },
      last_updated: new Date().toISOString(),
    };

    // Save merged progress back to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_progress: mergedProgress })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating progress:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save progress' },
        { status: 500 }
      );
    }

    const response: OnboardingProgressResponse = {
      success: true,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in save-onboarding-progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
