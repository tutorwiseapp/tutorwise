/**
 * Filename: apps/web/src/app/api/network/chat/send/route.ts
 * Purpose: API endpoint to send chat messages (persist to DB)
 * Created: 2025-11-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { MessageType } from '@/lib/ably';

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
    const { receiverId, content, type = MessageType.TEXT, metadata = {} } = body;

    // Validate inputs
    if (!receiverId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      );
    }

    // Verify connection exists and is accepted
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`
      )
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'No accepted connection found with this user' },
        { status: 403 }
      );
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        connection_id: connection.id,
        type,
        content: content.trim(),
        metadata,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[ChatAPI] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[ChatAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
