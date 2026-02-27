/**
 * Filename: api/ai-agents/[id]/unpublish/route.ts
 * Purpose: Unpublish an AI tutor from marketplace
 * Created: 2026-02-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and current status
    const { data: tutor, error: fetchError } = await supabase
      .from('ai_agents')
      .select('status')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !tutor) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    if (tutor.status !== 'published') {
      return NextResponse.json({ error: 'AI tutor is not currently published' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('ai_agents')
      .update({ status: 'unpublished', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unpublishing AI tutor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
