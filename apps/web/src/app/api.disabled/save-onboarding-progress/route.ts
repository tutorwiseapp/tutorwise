import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, progress } = await request.json();

    if (!userId || !progress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();

    // Update the user's onboarding progress
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_progress: progress })
      .eq('id', userId);

    if (error) {
      console.error('Error saving onboarding progress:', error);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    console.log(`Auto-save API: Progress saved for user ${userId} at step ${progress.current_step}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Auto-save API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}