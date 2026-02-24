/**
 * Filename: /api/ai-tutors/[id]/archive/route.ts
 * Purpose: Archive AI tutor (matches listings archive pattern)
 * Created: 2026-02-24
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await context.params;

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: aiTutor, error: fetchError } = await supabase
    .from('ai_tutors')
    .select('owner_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !aiTutor) {
    return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
  }

  if (aiTutor.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Archive the AI tutor
  const { error: updateError } = await supabase
    .from('ai_tutors')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Archive error:', updateError);
    return NextResponse.json({ error: 'Failed to archive AI tutor' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
