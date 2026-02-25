/*
 * API Route: PATCH /api/ai-tutors/[id]/featured
 * Purpose: Toggle is_featured flag for an AI tutor
 * Phase: 2A - Featured AI Tutors
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
        { error: 'Only admins can feature AI tutors' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { is_featured } = body;

    // Validate is_featured
    if (typeof is_featured !== 'boolean') {
      return NextResponse.json(
        { error: 'is_featured must be a boolean' },
        { status: 400 }
      );
    }

    // Update is_featured flag
    const { data: aiTutor, error: updateError } = await supabase
      .from('ai_tutors')
      .update({ is_featured })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating featured status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update featured status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: aiTutor,
      message: is_featured
        ? 'AI tutor featured successfully'
        : 'AI tutor unfeatured successfully',
    });
  } catch (error) {
    console.error('Error in featured toggle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
