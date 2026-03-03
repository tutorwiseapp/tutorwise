/**
 * Filename: api/ai-agents/[id]/track-view/route.ts
 * Purpose: Track public page views for AI agents (basic, mirrors profiles/[id]/track-view)
 * Created: 2026-03-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai-agents/[id]/track-view
 * Atomically increments view_count on ai_agents
 * Body: { session_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    // Atomically increment — mirrors profile view tracking pattern
    const { error } = await supabase.rpc('increment_ai_agent_views', { p_agent_id: id });

    if (error) {
      console.debug('AI agent view RPC failed:', error);
      // Silently fail — view tracking must never break the page
    }

    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.debug('AI agent view tracking failed:', error);
    return NextResponse.json({ tracked: false });
  }
}
