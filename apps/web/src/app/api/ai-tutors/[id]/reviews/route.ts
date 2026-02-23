/**
 * Filename: api/ai-tutors/[id]/reviews/route.ts
 * Purpose: Reviews for an AI tutor
 * Created: 2026-02-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get reviews from sessions (reviewed = true)
    // Strip client_id from response - this endpoint is public
    const { data: reviews, error, count } = await supabase
      .from('ai_tutor_sessions')
      .select('id, rating, review_text, reviewed_at, started_at', { count: 'exact' })
      .eq('ai_tutor_id', id)
      .eq('reviewed', true)
      .not('rating', 'is', null)
      .order('reviewed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      reviews: reviews || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, rating, review_text } = body;

    if (!session_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid review data' }, { status: 400 });
    }

    if (review_text && review_text.length > 2000) {
      return NextResponse.json({ error: 'Review text must be 2000 characters or less' }, { status: 400 });
    }

    // Verify session belongs to this user and AI tutor
    const { data: session, error: sessionError } = await supabase
      .from('ai_tutor_sessions')
      .select('id, client_id, reviewed')
      .eq('id', session_id)
      .eq('ai_tutor_id', id)
      .eq('client_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.reviewed) {
      return NextResponse.json({ error: 'Session already reviewed' }, { status: 400 });
    }

    // Update session with review
    const { error: updateError } = await supabase
      .from('ai_tutor_sessions')
      .update({
        reviewed: true,
        rating,
        review_text: review_text || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    if (updateError) throw updateError;

    // Update AI tutor avg_rating via RPC
    await supabase.rpc('ai_tutor_update_rating', { p_ai_tutor_id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
