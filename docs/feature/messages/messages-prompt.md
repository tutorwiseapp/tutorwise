# Messages - AI Prompt Context

**Version**: v4.3
**Last Updated**: 2025-12-12
**Purpose**: Context for AI assistants working on messages feature

---

## Quick Context for AI

When a user asks you to modify the messaging system, here's what you need to know:

### What This Feature Does
Real-time chat system with WhatsApp-style UI, powered by Ably for instant messaging. Features typing indicators, presence tracking, read receipts, and file/image support. Messages are validated through profile_graph connections.

### Key Files

**Main Hub Page**:
- [page.tsx](../../../apps/web/src/app/(authenticated)/messages/page.tsx) - Gold Standard Hub with 2-pane layout

**Components**:
- `apps/web/src/app/components/feature/messages/*.tsx` (6 total)
- ChatThread, ConversationList, InboxStatsWidget, Help/Tip widgets

**Custom Hooks**:
- `apps/web/src/app/hooks/useAblyTyping.tsx` - Typing indicators
- `apps/web/src/app/hooks/useAblyPresence.tsx` - Online/offline status

**API Routes**:
- `apps/web/src/app/api/messages/route.ts` - GET/POST messages
- `apps/web/src/app/api/messages/[id]/route.ts` - Mark as read
- `apps/web/src/app/api/conversations/route.ts` - Get conversation list

**Database**:
- Tables: `chat_messages`, `profile_graph`
- Functions: `get_conversations(user_id)`

---

## Common Modification Prompts

### 1. "Add support for message reactions (emoji)"

**Steps**:
1. Add reactions column to database
2. Create API endpoint for adding/removing reactions
3. Update ChatThread to show reactions
4. Publish reaction event to Ably

```typescript
// Migration: Add reactions column
ALTER TABLE chat_messages ADD COLUMN reactions JSONB DEFAULT '[]'::JSONB;

// Reactions structure
interface MessageReaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

// API: Add reaction
export async function POST(request: Request) {
  const { messageId, emoji, userId } = await request.json();

  const { data: message } = await supabase
    .from('chat_messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  const reactions = message.reactions || [];
  reactions.push({
    emoji,
    user_id: userId,
    created_at: new Date().toISOString(),
  });

  await supabase
    .from('chat_messages')
    .update({ reactions })
    .eq('id', messageId);

  // Publish to Ably
  await channel.publish('message:reaction', {
    messageId,
    emoji,
    userId,
  });
}

// UI: Render reactions
{message.reactions?.map((reaction, i) => (
  <span key={i} className={styles.reaction}>
    {reaction.emoji}
  </span>
))}
```

### 2. "Add message search functionality"

**Create search API**:
```typescript
// apps/web/src/app/api/messages/search/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const userId = searchParams.get('userId');

  const { data: messages } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, avatar_url),
      receiver:profiles!receiver_id(id, full_name, avatar_url)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  return Response.json({ messages });
}
```

**Add search UI**:
```typescript
// ConversationList.tsx
const [searchQuery, setSearchQuery] = useState('');

const { data: searchResults } = useQuery({
  queryKey: ['messages', 'search', searchQuery],
  queryFn: () => searchMessages(searchQuery, userId),
  enabled: searchQuery.length > 2,
});

<input
  type="search"
  placeholder="Search messages..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>

{searchResults?.messages.map(message => (
  <SearchResult key={message.id} message={message} />
))}
```

### 3. "Add message editing"

**Migration**: Add edited timestamp
```sql
ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMPTZ;
```

**API: Edit message**:
```typescript
// apps/web/src/app/api/messages/[id]/route.ts

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { content, userId } = await request.json();
  const messageId = params.id;

  // Verify user owns message
  const { data: message } = await supabase
    .from('chat_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();

  if (message.sender_id !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Update message
  await supabase
    .from('chat_messages')
    .update({
      content,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  // Publish to Ably
  await channel.publish('message:edited', {
    messageId,
    newContent: content,
    editedAt: new Date().toISOString(),
  });

  return Response.json({ success: true });
}
```

**UI: Show edited indicator**:
```typescript
<div className={styles.message}>
  <p>{message.content}</p>
  {message.edited_at && (
    <span className={styles.editedIndicator}>(edited)</span>
  )}
</div>
```

### 4. "Add message deletion"

**API: Delete message**:
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const messageId = params.id;
  const userId = await getCurrentUserId();

  // Verify ownership
  const { data: message } = await supabase
    .from('chat_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();

  if (message.sender_id !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Soft delete: Replace content with "[Deleted]"
  await supabase
    .from('chat_messages')
    .update({
      content: '[Deleted]',
      type: 'system',
      metadata: { deleted: true, deleted_at: new Date().toISOString() },
    })
    .eq('id', messageId);

  // Publish to Ably
  await channel.publish('message:deleted', { messageId });

  return Response.json({ success: true });
}
```

### 5. "Add voice message support"

**Migration**: No schema change needed (use type='file' with metadata)

**Record and upload voice**:
```typescript
const handleVoiceRecording = async (audioBlob: Blob) => {
  // Upload to Supabase Storage
  const fileName = `voice-${Date.now()}.webm`;
  const { data } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, audioBlob);

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(fileName);

  // Send message
  await sendMessage({
    sender_id: currentUserId,
    receiver_id: otherUserId,
    type: 'file',
    content: 'Voice message',
    metadata: {
      fileType: 'audio/webm',
      fileUrl: publicUrl,
      duration: audioBlob.size / 16000, // Estimate duration
      isVoiceMessage: true,
    },
  });
};
```

**Render voice message**:
```typescript
{message.metadata?.isVoiceMessage ? (
  <audio controls src={message.metadata.fileUrl}>
    Your browser does not support audio playback.
  </audio>
) : (
  <p>{message.content}</p>
)}
```

### 6. "Add notification for new messages"

**Browser notifications**:
```typescript
// Request permission
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Show notification
const showMessageNotification = (message: Message) => {
  if (Notification.permission === 'granted') {
    new Notification(`New message from ${message.sender.full_name}`, {
      body: message.content,
      icon: message.sender.avatar_url,
      tag: message.id,
      requireInteraction: false,
    });
  }
};

// In Ably subscription
useChannel(channelName, (message) => {
  if (message.name === 'message:new') {
    // Only show if tab not focused
    if (document.hidden) {
      showMessageNotification(message.data);
    }
  }
});
```

### 7. "Add typing indicator timeout configuration"

**File**: `hooks/useAblyTyping.tsx`

```typescript
const TYPING_TIMEOUT = 3000; // Make configurable
const TYPING_DEBOUNCE = 500; // Make configurable

export const useAblyTyping = (
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
  config = {
    timeout: TYPING_TIMEOUT,
    debounce: TYPING_DEBOUNCE,
  }
) => {
  // Use config.timeout and config.debounce
  useEffect(() => {
    if (isOtherUserTyping) {
      const timeout = setTimeout(() => {
        setIsOtherUserTyping(false);
      }, config.timeout); // Configurable

      return () => clearTimeout(timeout);
    }
  }, [isOtherUserTyping, config.timeout]);

  const debouncedStartTyping = useDebouncedCallback(
    () => {
      channel?.publish('typing:start', { userId: currentUserId });
    },
    config.debounce // Configurable
  );

  return { isOtherUserTyping, startTyping: debouncedStartTyping, stopTyping };
};
```

### 8. "Add group chat support"

**Migration**: Add group_id column
```sql
ALTER TABLE chat_messages ADD COLUMN group_id UUID REFERENCES chat_groups(id);

CREATE TABLE chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES chat_groups(id),
  profile_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'member', -- 'admin' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);
```

**Ably channel for groups**:
```typescript
export const AblyChannels = {
  // Existing privateChat...
  groupChat: (groupId: string) => `group-chat:${groupId}`,
};

// Publish to group
const channel = ably.channels.get(AblyChannels.groupChat(groupId));
await channel.publish('message:new', message);

// All group members receive
```

---

## Important Constraints

### MUST DO:
1. **Validate connections** - Check profile_graph before allowing messages
2. **Sort user IDs** - Always sort when creating channel names (consistent ordering)
3. **Use optimistic updates** - React Query for instant UI feedback
4. **Debounce typing indicators** - 500ms to reduce Ably calls
5. **Auto-clear typing** - 3-second timeout
6. **Mark messages as read** - When visible on screen (Intersection Observer)
7. **Handle Ably disconnects** - Reconnect logic and error states
8. **Validate file uploads** - Check file size, type before upload

### MUST NOT DO:
1. **Don't skip connection validation** - Always check profile_graph
2. **Don't send messages to blocked users** - Check block status
3. **Don't trust client timestamps** - Use server-side timestamps
4. **Don't publish sensitive data to Ably** - Only send message IDs, refetch full data
5. **Don't forget to cleanup Ably subscriptions** - Memory leaks
6. **Don't hardcode channel names** - Use helper functions with sorted IDs

---

## Key Workflows

### Send Message Flow
```
1. User types message
2. Optimistic update (status: sending)
3. POST /api/messages
   a. Validate connection (profile_graph)
   b. Insert to database
   c. Set status: sent
4. Publish to Ably (message:new event)
5. Receiver gets real-time update
6. Update status: delivered
7. When visible, mark as read
8. Update status: read
9. Publish to Ably (message:read event)
10. Sender sees read receipt
```

### Typing Indicator Flow
```
1. User starts typing
2. Debounce 500ms
3. Publish typing:start to Ably
4. Other user sees "typing..."
5. User stops typing OR 3s timeout
6. Publish typing:stop to Ably
7. Clear "typing..." indicator
```

### Presence Flow
```
1. User opens messages
2. Join presence channel
3. Publish presence:enter
4. Other users see "Online"
5. User closes/idle
6. Publish presence:leave
7. Update last_seen in database
8. Other users see "Last seen X ago"
```

---

## Ably Channel Patterns

### Private Chat
```typescript
// ALWAYS sort user IDs
const getPrivateChatChannel = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort();
  return `private-chat:${sortedIds[0]}:${sortedIds[1]}`;
};

// Example
getPrivateChatChannel('user-b', 'user-a');
// Returns: "private-chat:user-a:user-b" (sorted)
```

### User Presence
```typescript
const getUserPresenceChannel = (userId: string) => {
  return `presence:user:${userId}`;
};
```

### Group Chat (if implemented)
```typescript
const getGroupChatChannel = (groupId: string) => {
  return `group-chat:${groupId}`;
};
```

---

## React Query Patterns

### Fetch Messages
```typescript
const { data: messages } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => getMessages(conversationId),
});
```

### Send Message (Optimistic)
```typescript
const { mutate: send } = useMutation({
  mutationFn: sendMessage,
  onMutate: async (newMessage) => {
    await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
    const prev = queryClient.getQueryData(['messages', conversationId]);

    queryClient.setQueryData(['messages', conversationId], (old) => [
      ...old,
      {
        id: `temp-${Date.now()}`,
        ...newMessage,
        delivery_status: 'sending',
        created_at: new Date().toISOString(),
      },
    ]);

    return { prev };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['messages', conversationId], context?.prev);
  },
});
```

### Ably Real-Time Update
```typescript
useChannel(channelName, (message) => {
  if (message.name === 'message:new') {
    queryClient.setQueryData(['messages', conversationId], (old) => [
      ...old,
      message.data,
    ]);
  }
});
```

---

## Database Schema Quick Reference

### chat_messages
```sql
Key Fields:
- id, sender_id, receiver_id, group_id (optional)
- type: 'text' | 'image' | 'file' | 'system'
- content: TEXT
- metadata: JSONB (file info, reactions, etc.)
- read: BOOLEAN
- delivery_status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
- created_at, updated_at, edited_at
```

### profile_graph
```sql
Key Fields:
- profile_id, connected_profile_id
- connection_type: 'tutor_client' | 'agent_tutor' | etc.
- status: 'active' | 'inactive'
```

---

## Common Gotchas

1. **Ably channel mismatch**
   - **Fix**: Always sort user IDs when creating channel name

2. **Typing indicator stuck**
   - **Fix**: Add 3-second auto-clear timeout

3. **Messages sent to wrong user**
   - **Fix**: Validate sender_id/receiver_id match current users

4. **Connection validation fails**
   - **Fix**: Ensure profile_graph entry exists with status='active'

5. **Presence shows wrong status**
   - **Fix**: Update last_seen on presence:leave event

6. **Read receipts not working**
   - **Fix**: Publish message:read event after updating database

---

## Testing Checklist

When making changes, verify:
- [ ] Send text message
- [ ] Send image/file
- [ ] Typing indicator shows
- [ ] Typing indicator clears after 3s
- [ ] Online status shows correctly
- [ ] Last seen updates
- [ ] Read receipts work
- [ ] Optimistic updates work
- [ ] Messages appear in real-time
- [ ] Connection validation works
- [ ] Ably disconnects gracefully
- [ ] File upload works
- [ ] Search messages works (if implemented)

---

## File Paths Quick Reference

```
apps/web/src/app/
├─ (authenticated)/messages/
│   └─ page.tsx                       # Main hub
├─ components/feature/messages/
│   ├─ ChatThread.tsx                 # Chat UI
│   ├─ ConversationList.tsx           # Sidebar
│   └─ [widgets]
├─ hooks/
│   ├─ useAblyTyping.tsx              # Typing hook
│   └─ useAblyPresence.tsx            # Presence hook
├─ api/messages/
│   ├─ route.ts                       # GET/POST
│   ├─ [id]/route.ts                  # PATCH (read)
│   └─ search/route.ts                # Search (optional)
└─ api/conversations/
    └─ route.ts                       # Get conversations
```

---

**Last Updated**: 2025-12-12
**Version**: v4.3 (Delivery Status)
**For Questions**: See [implementation.md](./implementation.md)
