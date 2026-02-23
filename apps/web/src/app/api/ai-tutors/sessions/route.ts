/**
 * Filename: api/ai-tutors/sessions/route.ts
 * Purpose: Create AI tutor session (booking)
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/ai-tutors/sessions
 * Create new AI tutor session (booking)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ai_tutor_id } = await request.json();

    if (!ai_tutor_id) {
      return NextResponse.json(
        { error: 'ai_tutor_id is required' },
        { status: 400 }
      );
    }

    // Get AI tutor details
    const { data: aiTutor, error: tutorError } = await supabase
      .from('ai_tutors')
      .select('id, display_name, price_per_hour, status, subscription_status')
      .eq('id', ai_tutor_id)
      .single();

    if (tutorError || !aiTutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    // Verify AI tutor is published and has active subscription
    if (aiTutor.status !== 'published') {
      return NextResponse.json(
        { error: 'AI tutor is not available' },
        { status: 403 }
      );
    }

    if (aiTutor.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'AI tutor subscription is not active' },
        { status: 403 }
      );
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('ai_tutor_sessions')
      .insert({
        ai_tutor_id,
        client_id: user.id,
        price_paid: aiTutor.price_per_hour, // Full hourly rate
        platform_fee: aiTutor.price_per_hour * 0.1, // 10%
        owner_earnings: aiTutor.price_per_hour * 0.9, // 90%
        status: 'active',
        messages: [],
      })
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    return NextResponse.json(
      {
        sessionId: session.id,
        aiTutorName: aiTutor.display_name,
        pricePerHour: aiTutor.price_per_hour,
        startedAt: session.started_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating AI tutor session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
