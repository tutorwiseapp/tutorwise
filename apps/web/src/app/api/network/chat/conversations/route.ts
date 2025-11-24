/**
 * Filename: apps/web/src/app/api/network/chat/conversations/route.ts
 * Purpose: API endpoint to fetch all conversations for a user
 * Created: 2025-11-08
 * Updated: 2025-11-24 - Include all accepted connections (WhatsApp-style)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

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

    // 1. Get all accepted connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select(
        `
        id,
        requester_id,
        receiver_id,
        created_at,
        requester:requester_id(id, full_name, avatar_url),
        receiver:receiver_id(id, full_name, avatar_url)
      `
      )
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (connectionsError) {
      console.error('[ConversationsAPI] Error fetching connections:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    // 2. Get all messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(
        `
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        read
      `
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('[ConversationsAPI] Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // 3. Build conversations map from connections
    const conversationsMap = new Map<string, any>();

    connections?.forEach((conn: any) => {
      const isRequester = conn.requester_id === user.id;
      const otherUserId = isRequester ? conn.receiver_id : conn.requester_id;
      const otherUser = isRequester ? conn.receiver : conn.requester;

      conversationsMap.set(otherUserId, {
        id: otherUserId,
        otherUser: Array.isArray(otherUser) ? otherUser[0] : otherUser,
        lastMessage: null,
        unreadCount: 0,
        connectionTimestamp: new Date(conn.created_at).getTime(),
      });
    });

    // 4. Add message data to conversations
    messages?.forEach((msg: any) => {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

      // Skip if not a connection (shouldn't happen, but safety check)
      if (!conversationsMap.has(otherUserId)) return;

      const conv = conversationsMap.get(otherUserId);

      // Set last message if not set yet
      if (!conv.lastMessage) {
        conv.lastMessage = {
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
          read: msg.read,
        };
      }

      // Count unread messages from this user
      if (msg.receiver_id === user.id && !msg.read) {
        conv.unreadCount++;
      }
    });

    // 5. Sort conversations: unread first, then by last message time, then by connection time
    const conversations = Array.from(conversationsMap.values()).sort((a, b) => {
      // Unread messages come first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

      // Then sort by last message timestamp (if both have messages)
      if (a.lastMessage && b.lastMessage) {
        return b.lastMessage.timestamp - a.lastMessage.timestamp;
      }

      // If only one has messages, prioritize it
      if (a.lastMessage && !b.lastMessage) return -1;
      if (b.lastMessage && !a.lastMessage) return 1;

      // If neither has messages, sort by connection time (most recent first)
      return b.connectionTimestamp - a.connectionTimestamp;
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
