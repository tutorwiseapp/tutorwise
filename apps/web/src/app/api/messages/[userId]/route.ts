/**
 * Filename: apps/web/src/app/api/messages/[userId]/route.ts
 * Purpose: API endpoint to fetch conversation history between two users
 * Created: 2025-11-08
 * Updated: 2026-02-05 - Moved from /api/network/chat/ to /api/messages/
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
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

    const { userId: otherUserId } = params;

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch messages using the database function
    const { data, error } = await supabase.rpc('get_conversation', {
      other_user_id: otherUserId,
      limit_count: 100,
    });

    if (error) {
      console.error('[MessagesAPI] Error fetching conversation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Transform to match frontend format
    const messages = (data || []).map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      type: msg.type,
      content: msg.content,
      metadata: msg.metadata || {},
      timestamp: new Date(msg.created_at).getTime(),
      read: msg.read,
      readAt: msg.read_at,
    }));

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error('[MessagesAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
