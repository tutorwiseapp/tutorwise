/**
 * Filename: apps/web/src/app/api/network/chat/mark-conversation-read/route.ts
 * Purpose: API endpoint to mark all messages in a conversation as read
 * Created: 2025-11-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Mark all unread messages from this user as read
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (updateError) {
      console.error('[MarkConversationRead] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark messages as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[MarkConversationRead] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
