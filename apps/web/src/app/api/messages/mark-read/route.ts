/**
 * Filename: apps/web/src/app/api/messages/mark-read/route.ts
 * Purpose: API endpoint to mark messages as read
 * Created: 2025-11-08
 * Updated: 2026-02-05 - Moved from /api/network/chat/ to /api/messages/
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Mark message as read using the database function
    const { data, error } = await supabase.rpc('mark_message_as_read', {
      message_id: messageId,
    });

    if (error) {
      console.error('[MessagesAPI] Error marking message as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: data }, { status: 200 });
  } catch (error) {
    console.error('[MessagesAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
