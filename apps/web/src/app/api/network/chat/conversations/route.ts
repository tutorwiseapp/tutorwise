/**
 * Filename: apps/web/src/app/api/network/chat/conversations/route.ts
 * Purpose: API endpoint to fetch all conversations for a user
 * Created: 2025-11-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get all unique conversation partners
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(
        `
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        read,
        sender:sender_id(id, full_name, avatar_url),
        receiver:receiver_id(id, full_name, avatar_url)
      `
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('[ConversationsAPI] Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Group messages by conversation partner
    const conversationsMap = new Map<string, any>();

    messages?.forEach((msg: any) => {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          id: otherUserId,
          otherUser: Array.isArray(otherUser) ? otherUser[0] : otherUser,
          lastMessage: {
            content: msg.content,
            timestamp: new Date(msg.created_at).getTime(),
            read: msg.read,
          },
          unreadCount: 0,
        });
      }

      // Count unread messages from this user
      if (msg.receiver_id === user.id && !msg.read) {
        const conv = conversationsMap.get(otherUserId);
        if (conv) {
          conv.unreadCount++;
        }
      }
    });

    const conversations = Array.from(conversationsMap.values()).sort((a, b) => {
      return b.lastMessage.timestamp - a.lastMessage.timestamp;
    });

    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error) {
    console.error('[ConversationsAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
