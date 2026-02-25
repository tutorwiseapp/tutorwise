/*
 * API Route: PATCH /api/ai-tutors/[id]/priority
 * Purpose: Update priority_rank for an AI tutor
 * Phase: 2A - Priority Ranking
 * Created: 2026-02-25
 * Access: Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can set priority ranks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { priority_rank } = body;

    // Validate priority_rank
    if (typeof priority_rank !== 'number' || priority_rank < 0) {
      return NextResponse.json(
        { error: 'priority_rank must be a non-negative number' },
        { status: 400 }
      );
    }

    // Update priority_rank
    const { data: aiTutor, error: updateError } = await supabase
      .from('ai_tutors')
      .update({ priority_rank })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating priority:', updateError);
      return NextResponse.json(
        { error: 'Failed to update priority rank' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: aiTutor,
      message: `Priority updated to ${priority_rank}`,
    });
  } catch (error) {
    console.error('Error in priority update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
