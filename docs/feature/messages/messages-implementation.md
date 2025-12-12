# Messages - Implementation Guide

**Version**: v4.3
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [Ably Integration](#ably-integration)
6. [Custom Hooks](#custom-hooks)
7. [Database Schema](#database-schema)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/messages/
│   ├─ page.tsx                         # Main hub page (Server Component)
│   └─ page.module.css
│
├─ app/components/feature/messages/
│   ├─ ChatThread.tsx                   # Chat interface
│   ├─ ChatThread.module.css
│   ├─ ConversationList.tsx             # Conversation sidebar
│   ├─ ConversationList.module.css
│   ├─ InboxStatsWidget.tsx             # Stats widget
│   ├─ MessageHelpWidget.tsx            # Help widget
│   ├─ MessageTipWidget.tsx             # Tips widget
│   └─ MessagesSkeleton.tsx             # Loading state
│
├─ app/hooks/
│   ├─ useAblyTyping.tsx                # Typing indicators hook
│   └─ useAblyPresence.tsx              # Presence tracking hook
│
├─ app/api/messages/
│   ├─ route.ts                         # GET/POST messages
│   └─ [id]/route.ts                    # PATCH message (mark read)
│
├─ app/api/conversations/
│   └─ route.ts                         # GET conversations
│
└─ lib/
    ├─ ably.ts                          # Ably client setup
    └─ api/messages.ts                  # Client-side API functions
```

---

## Component Overview

### ChatThread Component

The main chat interface with real-time updates.

**Features**:
- Message list with auto-scroll to bottom
- Input field with file upload
- Typing indicator display
- Delivery status icons
- Optimistic UI updates

**Props**:
```typescript
interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
}
```

### ConversationList Component

WhatsApp-style conversation sidebar.

**Features**:
- List of conversations sorted by recent activity
- Unread message count badges
- Last message preview
- Online/offline status indicators
- Search/filter conversations

**Props**:
```typescript
interface ConversationListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}
```

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Ably account created
- React Query installed

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

NEXT_PUBLIC_ABLY_PUBLISHABLE_KEY=your_ably_key
ABLY_SECRET_KEY=your_ably_secret
```

### Ably Setup

1. Create Ably account at https://ably.com
2. Create new app in Ably dashboard
3. Copy API keys to `.env.local`
4. Enable presence and history features

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install Ably SDK
npm install ably @ably-labs/react-hooks

# 3. Start dev server
npm run dev

# 4. Open messages page
open http://localhost:3000/messages
```

---

## Common Tasks

### Task 1: Send a Text Message

```typescript
// Client-side component
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '@/lib/api/messages';

const ChatThread = ({ conversationId, currentUserId, otherUserId }) => {
  const [messageText, setMessageText] = useState('');
  const queryClient = useQueryClient();

  const { mutate: send } = useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      queryClient.setQueryData(['messages', conversationId], (old: Message[]) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          ...newMessage,
          delivery_status: 'sending',
          created_at: new Date().toISOString(),
        },
      ]);

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      queryClient.setQueryData(['messages', conversationId], context?.previousMessages);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;

    send({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      type: 'text',
      content: messageText,
    });

    setMessageText('');
  };

  return (
    <div>
      {/* Message list */}
      <input
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};
```

### Task 2: Setup Ably Real-Time Subscription

```typescript
// lib/ably.ts - Ably client setup

import { Realtime } from 'ably';

export const getAblyClient = () => {
  return new Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_PUBLISHABLE_KEY!,
    clientId: getCurrentUserId(), // Get from auth
  });
};

export const getPrivateChatChannel = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort();
  return `private-chat:${sortedIds[0]}:${sortedIds[1]}`;
};
```

```typescript
// ChatThread.tsx - Subscribe to messages

import { useEffect } from 'react';
import { useChannel } from '@ably-labs/react-hooks';

const ChatThread = ({ conversationId, currentUserId, otherUserId }) => {
  const channelName = getPrivateChatChannel(currentUserId, otherUserId);

  const { channel } = useChannel(channelName, (message) => {
    if (message.name === 'message:new') {
      // New message received
      queryClient.setQueryData(['messages', conversationId], (old: Message[]) => [
        ...old,
        message.data,
      ]);
    } else if (message.name === 'message:read') {
      // Message marked as read
      queryClient.setQueryData(['messages', conversationId], (old: Message[]) =>
        old.map(m =>
          m.id === message.data.messageId
            ? { ...m, read: true, delivery_status: 'read' }
            : m
        )
      );
    }
  });

  return (/* UI */);
};
```

### Task 3: Implement Typing Indicators

```typescript
// hooks/useAblyTyping.tsx

import { useState, useEffect, useCallback } from 'react';
import { useChannel } from '@ably-labs/react-hooks';

export const useAblyTyping = (
  conversationId: string,
  currentUserId: string,
  otherUserId: string
) => {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const channelName = getPrivateChatChannel(currentUserId, otherUserId);

  const { channel } = useChannel(channelName, (message) => {
    if (message.name === 'typing:start' && message.data.userId === otherUserId) {
      setIsOtherUserTyping(true);
    } else if (message.name === 'typing:stop' && message.data.userId === otherUserId) {
      setIsOtherUserTyping(false);
    }
  });

  // Auto-clear typing indicator after 3 seconds
  useEffect(() => {
    if (isOtherUserTyping) {
      const timeout = setTimeout(() => {
        setIsOtherUserTyping(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isOtherUserTyping]);

  const startTyping = useCallback(() => {
    channel?.publish('typing:start', { userId: currentUserId });
  }, [channel, currentUserId]);

  const stopTyping = useCallback(() => {
    channel?.publish('typing:stop', { userId: currentUserId });
  }, [channel, currentUserId]);

  return {
    isOtherUserTyping,
    startTyping,
    stopTyping,
  };
};
```

```typescript
// Usage in ChatThread
const { isOtherUserTyping, startTyping, stopTyping } = useAblyTyping(
  conversationId,
  currentUserId,
  otherUserId
);

// Debounced typing handler
const handleTyping = useDebouncedCallback(() => {
  startTyping();
}, 500);

<input
  onChange={(e) => {
    setMessageText(e.target.value);
    handleTyping();
  }}
  onBlur={stopTyping}
/>

{isOtherUserTyping && <div className={styles.typingIndicator}>typing...</div>}
```

### Task 4: Implement Presence Tracking

```typescript
// hooks/useAblyPresence.tsx

import { useState, useEffect } from 'react';
import { usePresence } from '@ably-labs/react-hooks';

export const useAblyPresence = (targetUserId: string) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  const channelName = `presence:user:${targetUserId}`;

  const { presenceData } = usePresence(channelName);

  useEffect(() => {
    const userPresence = presenceData.find(p => p.clientId === targetUserId);

    if (userPresence) {
      setIsOnline(true);
      setLastSeen(null);
    } else {
      setIsOnline(false);
      // Fetch last seen from database
      fetchLastSeen(targetUserId).then(setLastSeen);
    }
  }, [presenceData, targetUserId]);

  return {
    isOnline,
    lastSeen,
  };
};
```

```typescript
// Usage in ChatThread header
const { isOnline, lastSeen } = useAblyPresence(otherUserId);

<div className={styles.userStatus}>
  {isOnline ? (
    <span className={styles.online}>Online</span>
  ) : lastSeen ? (
    <span className={styles.offline}>Last seen {formatLastSeen(lastSeen)}</span>
  ) : (
    <span className={styles.offline}>Offline</span>
  )}
</div>
```

### Task 5: Mark Messages as Read

```typescript
// API Route: apps/web/src/app/api/messages/[id]/route.ts

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { read } = await request.json();
  const messageId = params.id;

  // Update message
  const { data: message, error } = await supabase
    .from('chat_messages')
    .update({
      read,
      delivery_status: read ? 'read' : 'delivered',
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;

  // Publish to Ably
  const ably = getAblyClient();
  const channel = ably.channels.get(
    getPrivateChatChannel(message.sender_id, message.receiver_id)
  );

  await channel.publish('message:read', {
    messageId,
    readAt: new Date().toISOString(),
  });

  return Response.json({ message });
}
```

```typescript
// Client-side: Auto-mark as read when message visible
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const messageId = entry.target.getAttribute('data-message-id');
          markAsRead(messageId);
        }
      });
    },
    { threshold: 0.5 }
  );

  // Observe unread messages
  document.querySelectorAll('[data-unread="true"]').forEach((el) => {
    observer.observe(el);
  });

  return () => observer.disconnect();
}, [messages]);
```

### Task 6: Send File/Image Message

```typescript
// File upload handler

const handleFileUpload = async (file: File) => {
  // Upload to Supabase Storage
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, file);

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(fileName);

  // Determine message type
  const messageType = file.type.startsWith('image/') ? 'image' : 'file';

  // Send message
  await sendMessage({
    sender_id: currentUserId,
    receiver_id: otherUserId,
    type: messageType,
    content: file.name,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileUrl: publicUrl,
      ...(messageType === 'image' && { imageUrl: publicUrl }),
    },
  });
};
```

### Task 7: Validate Connection Before Messaging

```typescript
// API Route: apps/web/src/app/api/messages/route.ts

export async function POST(request: Request) {
  const { sender_id, receiver_id, type, content, metadata } = await request.json();

  // Validate connection exists
  const { data: connection } = await supabase
    .from('profile_graph')
    .select('*')
    .or(`
      and(profile_id.eq.${sender_id},connected_profile_id.eq.${receiver_id}),
      and(profile_id.eq.${receiver_id},connected_profile_id.eq.${sender_id})
    `)
    .eq('status', 'active')
    .single();

  if (!connection) {
    return Response.json(
      { error: 'No connection between users' },
      { status: 403 }
    );
  }

  // Insert message
  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id,
      receiver_id,
      type,
      content,
      metadata,
      delivery_status: 'sent',
    })
    .select()
    .single();

  if (error) throw error;

  // Publish to Ably
  const ably = getAblyClient();
  const channel = ably.channels.get(
    getPrivateChatChannel(sender_id, receiver_id)
  );

  await channel.publish('message:new', message);

  return Response.json({ message });
}
```

### Task 8: Fetch Conversations with Last Message

```typescript
// API Route: apps/web/src/app/api/conversations/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Get all conversations (users who have messaged current user)
  const { data: conversations } = await supabase.rpc('get_conversations', {
    user_id: userId,
  });

  // conversations = [
  //   {
  //     other_user_id,
  //     other_user_name,
  //     other_user_avatar,
  //     last_message_content,
  //     last_message_created_at,
  //     unread_count,
  //   }
  // ]

  return Response.json({ conversations });
}
```

```sql
-- Database function: get_conversations

CREATE OR REPLACE FUNCTION get_conversations(user_id UUID)
RETURNS TABLE (
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  last_message_content TEXT,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH messages_with_other_user AS (
    SELECT
      CASE
        WHEN sender_id = user_id THEN receiver_id
        ELSE sender_id
      END AS other_user,
      content,
      created_at,
      read,
      sender_id
    FROM chat_messages
    WHERE sender_id = user_id OR receiver_id = user_id
  )
  SELECT
    m.other_user AS other_user_id,
    p.full_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    (
      SELECT content
      FROM messages_with_other_user
      WHERE other_user = m.other_user
      ORDER BY created_at DESC
      LIMIT 1
    ) AS last_message_content,
    (
      SELECT created_at
      FROM messages_with_other_user
      WHERE other_user = m.other_user
      ORDER BY created_at DESC
      LIMIT 1
    ) AS last_message_created_at,
    (
      SELECT COUNT(*)
      FROM messages_with_other_user
      WHERE other_user = m.other_user
        AND NOT read
        AND sender_id != user_id
    ) AS unread_count
  FROM (
    SELECT DISTINCT other_user
    FROM messages_with_other_user
  ) m
  JOIN profiles p ON p.id = m.other_user
  ORDER BY last_message_created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## Ably Integration

### Channel Setup

```typescript
// lib/ably.ts

export const AblyChannels = {
  privateChat: (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `private-chat:${sortedIds[0]}:${sortedIds[1]}`;
  },
  userPresence: (userId: string) => `presence:user:${userId}`,
};

export const AblyEvents = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_ENTER: 'presence:enter',
  PRESENCE_LEAVE: 'presence:leave',
};
```

### Publishing Events

```typescript
// Publish new message
await channel.publish(AblyEvents.MESSAGE_NEW, {
  id: message.id,
  sender_id: message.sender_id,
  content: message.content,
  created_at: message.created_at,
});

// Publish typing indicator
await channel.publish(AblyEvents.TYPING_START, {
  userId: currentUserId,
});

// Publish presence
await channel.presence.enter({
  userId: currentUserId,
  status: 'online',
});
```

---

## Custom Hooks

### useAblyTyping

```typescript
interface UseAblyTypingReturn {
  isOtherUserTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

const { isOtherUserTyping, startTyping, stopTyping } = useAblyTyping(
  conversationId,
  currentUserId,
  otherUserId
);
```

### useAblyPresence

```typescript
interface UseAblyPresenceReturn {
  isOnline: boolean;
  lastSeen: Date | null;
}

const { isOnline, lastSeen } = useAblyPresence(targetUserId);
```

---

## Database Schema

### chat_messages table

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Users
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),

  -- Content
  type TEXT NOT NULL, -- 'text' | 'image' | 'file' | 'system'
  content TEXT NOT NULL,
  metadata JSONB, -- For file/image URLs, sizes, etc.

  -- Status
  read BOOLEAN DEFAULT FALSE,
  delivery_status TEXT DEFAULT 'sent', -- 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(sender_id, receiver_id);
```

### profile_graph table

```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  profile_id UUID NOT NULL REFERENCES profiles(id),
  connected_profile_id UUID NOT NULL REFERENCES profiles(id),

  connection_type TEXT NOT NULL, -- 'tutor_client' | 'agent_tutor' | etc.
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, connected_profile_id)
);

CREATE INDEX idx_profile_graph_profile_id ON profile_graph(profile_id);
CREATE INDEX idx_profile_graph_connected_id ON profile_graph(connected_profile_id);
```

---

## Testing

### Component Testing

```typescript
// __tests__/ChatThread.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ChatThread } from '../ChatThread';

describe('ChatThread', () => {
  it('sends message on enter key', () => {
    const mockSend = jest.fn();

    render(
      <ChatThread
        conversationId="123"
        currentUserId="user1"
        otherUserId="user2"
        onSendMessage={mockSend}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

    expect(mockSend).toHaveBeenCalledWith('Hello');
  });
});
```

### Ably Hook Testing

```typescript
// __tests__/useAblyTyping.test.tsx

import { renderHook, act } from '@testing-library/react-hooks';
import { useAblyTyping } from '../useAblyTyping';

describe('useAblyTyping', () => {
  it('auto-clears typing after 3 seconds', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useAblyTyping('conv1', 'user1', 'user2')
    );

    act(() => {
      result.current.startTyping();
    });

    expect(result.current.isOtherUserTyping).toBe(false); // Current user typing, not other

    // Simulate other user typing
    act(() => {
      // Trigger Ably event
    });

    expect(result.current.isOtherUserTyping).toBe(true);

    // Fast-forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.isOtherUserTyping).toBe(false);
  });
});
```

---

## Troubleshooting

### Issue: Messages not appearing in real-time

**Solution**: Check Ably connection and channel subscription

```typescript
// Debug Ably connection
const ably = getAblyClient();
ably.connection.on('connected', () => {
  console.log('Ably connected');
});

ably.connection.on('failed', () => {
  console.error('Ably connection failed');
});
```

### Issue: Typing indicator stuck

**Solution**: Ensure auto-clear timeout is working

```typescript
// Add cleanup in useEffect
useEffect(() => {
  const timeout = setTimeout(() => {
    setIsOtherUserTyping(false);
  }, 3000);

  return () => clearTimeout(timeout); // Cleanup
}, [isOtherUserTyping]);
```

### Issue: Messages sent to wrong user

**Solution**: Validate channel name calculation

```typescript
// Ensure IDs are sorted consistently
const getPrivateChatChannel = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort(); // IMPORTANT: Sort
  return `private-chat:${sortedIds[0]}:${sortedIds[1]}`;
};
```

---

## Related Files

- Ably Setup: [lib/ably.ts](../../../apps/web/src/lib/ably.ts)
- API: [lib/api/messages.ts](../../../apps/web/src/lib/api/messages.ts)
- Types: [packages/shared-types/src/message.ts](../../../packages/shared-types/src/message.ts)

---

**Last Updated**: 2025-12-12
**Version**: v4.3
**Maintainer**: Frontend Team
