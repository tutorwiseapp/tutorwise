/**
 * Filename: api/ai-agents/[id]/publish/route.ts
 * Purpose: Publish AI tutor to marketplace
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { publishAIAgent } from '@/lib/ai-agents/adapter';

/**
 * POST /api/ai-agents/[id]/publish
 * Publish AI tutor (requires active subscription)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await publishAIAgent(id, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error publishing AI tutor:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('subscription')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to publish AI tutor' },
      { status: 500 }
    );
  }
}
