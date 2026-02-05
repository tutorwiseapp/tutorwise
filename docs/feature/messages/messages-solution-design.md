# Messages Feature - Solution Design

**Version**: v4.3 (Delivery Status)
**Last Updated**: 2025-12-12
**Status**: Active
**Architecture**: Gold Standard Hub + Ably Real-Time
**Owner**: Backend Team

---

## Executive Summary

The Messages feature provides a real-time chat system for Tutorwise users with WhatsApp-style UI, powered by Ably for instant messaging. The system supports 1-on-1 conversations with typing indicators, presence tracking, read receipts, and file/image sharing. Messages are validated through the `profile_graph` table to ensure users can only message active connections.

**Key Technologies**:
- **Ably Chat** (@ably/chat) - Real-time messaging infrastructure
- **Ably Realtime** (ably) - Pub/sub for typing and presence
- **React Query** - State management and optimistic updates
- **Supabase Database** - Message persistence and connection validation
- **Next.js 14+ App Router** - Gold Standard Hub architecture

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MESSAGES ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐                                    ┌──────────────┐
│   User A     │                                    │   User B     │
│  (Browser)   │                                    │  (Browser)   │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │ Types message                                    │
       ↓                                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│              CLIENT-SIDE (React Query + Ably)                   │
│ ┌───────────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│ │ ChatThread.tsx    │  │ useAblyTyping│  │ useAblyPresence │  │
│ │ Optimistic Update │  │ Debounce 500ms│  │ Online/Offline  │  │
│ └───────────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────┬───────────────────────────────────┬───────────────┘
              │                                   │
              │ POST /api/messages/send      │ Subscribe
              ↓                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                        │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 1. Validate Auth (Supabase Auth)                          │  │
│ │ 2. Check Connection (profile_graph SOCIAL + ACTIVE)       │  │
│ │ 3. Insert Message (chat_messages table)                   │  │
│ │ 4. Publish to Ably Channel                                │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────┬───────────────┘
              │                                   │
              ↓                                   ↓
┌─────────────────────────┐         ┌───────────────────────────┐
│   SUPABASE DATABASE     │         │      ABLY REAL-TIME       │
│ ┌─────────────────────┐ │         │ ┌───────────────────────┐ │
│ │ chat_messages       │ │         │ │ Channel:              │ │
│ │ profile_graph       │ │         │ │ private-chat:a:b      │ │
│ │ profiles            │ │         │ │                       │ │
│ └─────────────────────┘ │         │ │ Events:               │ │
│                         │         │ │ • message:new         │ │
│ RLS Policies:           │         │ │ • message:read        │ │
│ • User can view own     │         │ │ • typing:start/stop   │ │
│ • User can send to      │         │ │ • presence:enter/leave│ │
│   connections only      │         │ └───────────────────────┘ │
└─────────────────────────┘         └───────────────────────────┘
```

---

## System Integrations

### 1. AUTHENTICATION INTEGRATION

**How It Works**:

**Middleware Protection**:
- `/messages` route protected via middleware
- Checks `supabase.auth.getUser()` for valid session
- Redirects to `/login?redirect=/messages` if unauthenticated
- Enforces onboarding completion before access

**API Route Protection**:
```typescript
// All chat API routes
export const dynamic = 'force-dynamic'; // Required for cookies in Next.js 15

const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Integration Points**:
- **File**: `apps/web/src/middleware.ts` (line 67)
- **Files**: `apps/web/src/app/api/messages/**/route.ts` (all routes)

**What Gets Protected**:
- Main messages hub page
- All chat API endpoints (send, mark-read, conversations)
- Ably channel subscriptions (client-side auth check)

---

### 2. PROFILES INTEGRATION

**How It Works**:

**User Data Display**:
```typescript
// Fetch user profile for conversation list
const { data: conversations } = await supabase
  .from('chat_messages')
  .select(`
    *,
    sender:profiles!sender_id(id, full_name, avatar_url, slug),
    receiver:profiles!receiver_id(id, full_name, avatar_url, slug)
  `)
  .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  .order('created_at', { ascending: false });
```

**Avatar Rendering**:
```typescript
// ConversationList.tsx
import { getProfileImageUrl } from '@/lib/utils/profile';

<Image
  src={getProfileImageUrl(conversation.other_user.avatar_url)}
  alt={conversation.other_user.full_name}
  fallback={conversation.other_user.full_name.charAt(0)} // Initials
/>
```

**Integration Points**:
- **File**: `apps/web/src/app/components/feature/messages/ConversationList.tsx` (line 98-102)
- **File**: `apps/web/src/app/components/feature/messages/ChatThread.tsx` (line 275-280)
- **File**: `apps/web/src/app/api/messages/conversations/route.ts` (line 37-38)

**What Gets Used**:
- `full_name` - Display name in chat header and conversation list
- `avatar_url` - User avatar (with fallback to initials)
- `slug` - Profile link in chat header (`/public-profile/{slug}`)
- `id` - Foreign key for sender_id/receiver_id

---

### 3. NETWORK INTEGRATION (profile_graph) - CRITICAL DEPENDENCY

**How It Works**:

**Connection Validation** (Before Sending Message):
```typescript
// apps/web/src/app/api/messages/send/route.ts (line 41-55)

// Check if users have ACTIVE SOCIAL connection
const { data: connection } = await supabase
  .from('profile_graph')
  .select('*')
  .eq('relationship_type', 'SOCIAL')
  .eq('status', 'ACTIVE')
  .or(
    `and(source_profile_id.eq.${senderId},target_profile_id.eq.${receiverId}),` +
    `and(source_profile_id.eq.${receiverId},target_profile_id.eq.${senderId})`
  )
  .maybeSingle();

if (!connection) {
  return NextResponse.json(
    { error: 'No active connection between users' },
    { status: 403 }
  );
}
```

**Conversation List Population**:
```typescript
// apps/web/src/app/api/messages/conversations/route.ts (line 28-51)

// Get ALL accepted connections (WhatsApp-style)
const { data: connections } = await supabase
  .from('profile_graph')
  .select(`
    *,
    source_profile:profiles!source_profile_id(id, full_name, avatar_url, slug),
    target_profile:profiles!target_profile_id(id, full_name, avatar_url, slug)
  `)
  .eq('relationship_type', 'SOCIAL')
  .eq('status', 'ACTIVE')
  .or(`source_profile_id.eq.${userId},target_profile_id.eq.${userId}`);

// Show connections even if no messages yet
```

**Integration Points**:
- **File**: `apps/web/src/app/api/messages/send/route.ts` (line 41-55)
- **File**: `apps/web/src/app/api/messages/conversations/route.ts` (line 28-51)
- **File**: `apps/web/src/lib/services/ProfileGraphService.ts`
- **Migration**: `apps/api/migrations/061_add_profile_graph_v4_6.sql`

**Relationship Types in profile_graph**:
- **SOCIAL** - Used for messaging (mutual connections) ✅
- **GUARDIAN** - Parent-student relationships (NOT for messaging)
- **BOOKING** - Tutor-client booking relationships
- **AGENT_DELEGATION** - Agent commission delegation
- **AGENT_REFERRAL** - Agent referrals

**Security Model**:
- Users can ONLY send messages to ACTIVE SOCIAL connections
- Bidirectional query checks both source and target profile IDs
- Returns 403 Forbidden if no connection exists
- Prevents spam and unauthorized messaging

---

### 4. ABLY REAL-TIME INTEGRATION

**How It Works**:

**Client Configuration**:
```typescript
// apps/web/src/lib/ably.ts

import * as Ably from 'ably';
import { ChatClient } from '@ably/chat';

export const ably = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_KEY,
  clientId: userId, // Set dynamically
});

export const ablyChat = new ChatClient(ably);

// Channel naming conventions
export const AblyChannels = {
  privateChat: (userId1: string, userId2: string) => {
    const [id1, id2] = [userId1, userId2].sort(); // CRITICAL: Always sort
    return `private-chat:${id1}:${id2}`;
  },
  userPresence: (userId: string) => `presence:user:${userId}`,
};
```

**Real-Time Events Published**:

1. **message:new** - New message sent
   ```typescript
   await channel.publish('message:new', {
     id: message.id,
     sender_id: message.sender_id,
     receiver_id: message.receiver_id,
     content: message.content,
     type: message.type,
     created_at: message.created_at,
   });
   ```

2. **message:read** - Message marked as read
   ```typescript
   await channel.publish('message:read', {
     message_id: messageId,
     read_at: new Date().toISOString(),
   });
   ```

3. **typing:start / typing:stop** - Typing indicators
   ```typescript
   // Debounced 500ms
   await channel.publish('typing:start', { userId });

   // Auto-clear after 3 seconds
   setTimeout(() => {
     channel.publish('typing:stop', { userId });
   }, 3000);
   ```

4. **presence:enter / presence:leave** - User online status
   ```typescript
   // User comes online
   await channel.presence.enter({ userId });

   // User goes offline
   await channel.presence.leave({ userId });
   ```

**Integration Points**:
- **File**: `apps/web/src/lib/ably.ts` - Configuration
- **File**: `apps/web/src/app/hooks/useAblyTyping.tsx` - Typing hook
- **File**: `apps/web/src/app/hooks/useAblyPresence.tsx` - Presence hook
- **File**: `apps/web/src/app/components/feature/messages/ChatThread.tsx` (line 67-159)

**Performance Optimizations**:
- Typing debounce: 500ms (reduces API calls)
- Typing auto-clear: 3 seconds
- Presence updates: Only on enter/leave (not continuous polling)
- Message batching: React Query deduplicates requests

---

### 5. SUPABASE REALTIME INTEGRATION (Connections Only)

**How It Works**:

**Connection Request Notifications** (NOT Messages):
```typescript
// apps/web/src/app/hooks/useConnectionsRealtime.tsx

useEffect(() => {
  const channel = supabase
    .channel('profile_graph_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profile_graph',
        filter: `target_profile_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.success('New connection request!');
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

**Integration Points**:
- **File**: `apps/web/src/app/hooks/useConnectionsRealtime.tsx`
- **Purpose**: Notifies when new connection requests arrive
- **Updates**: Conversation list when connections change

**Note**: Messages themselves use Ably, NOT Supabase Realtime. Supabase Realtime is ONLY for connection requests.

---

### 6. DATABASE SCHEMA INTEGRATION

**chat_messages Table**:
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES profile_graph(id), -- Optional tracking
  type TEXT NOT NULL, -- 'text' | 'image' | 'file' | 'system'
  content TEXT NOT NULL,
  metadata JSONB, -- For file URLs, sizes, reactions, etc.
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivery_status TEXT, -- 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(sender_id, receiver_id, created_at DESC);
```

**Row Level Security (RLS) Policies**:
```sql
-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

-- Users can insert messages if they have active connection
CREATE POLICY "Users can send to connections"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM profile_graph
      WHERE relationship_type = 'SOCIAL'
        AND status = 'ACTIVE'
        AND (
          (source_profile_id = sender_id AND target_profile_id = receiver_id) OR
          (source_profile_id = receiver_id AND target_profile_id = sender_id)
        )
    )
  );

-- Users can update messages they sent (for read receipts)
CREATE POLICY "Users can update own messages"
  ON chat_messages FOR UPDATE
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );
```

**Database Functions**:
```sql
-- Get conversation history
CREATE FUNCTION get_conversation(
  p_other_user_id UUID,
  p_limit_count INT DEFAULT 50
)
RETURNS TABLE (/* message fields */)
AS $$
  SELECT *
  FROM chat_messages
  WHERE (
    (sender_id = auth.uid() AND receiver_id = p_other_user_id) OR
    (sender_id = p_other_user_id AND receiver_id = auth.uid())
  )
  ORDER BY created_at DESC
  LIMIT p_limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Mark message as read
CREATE FUNCTION mark_message_as_read(p_message_id UUID)
RETURNS VOID AS $$
  UPDATE chat_messages
  SET read = TRUE,
      read_at = NOW(),
      delivery_status = 'read'
  WHERE id = p_message_id
    AND receiver_id = auth.uid(); -- Only receiver can mark as read
$$ LANGUAGE sql SECURITY DEFINER;
```

**Integration Points**:
- **File**: `apps/web/src/app/api/messages/[userId]/route.ts` (line 40-42)
- **File**: `apps/web/src/app/api/messages/mark-read/route.ts` (line 39-41)

---

### 7. EMAIL NOTIFICATIONS INTEGRATION (Partial)

**How It Works**:

**Connection Request Emails** (NOT message notifications):
```typescript
// apps/web/src/lib/services/ProfileGraphService.ts (line 462-502)

export async function sendConnectionRequestNotification(
  targetProfileId: string,
  sourceProfileId: string
) {
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', targetProfileId)
    .single();

  const { data: sourceProfile } = await supabase
    .from('profiles')
    .select('full_name, slug')
    .eq('id', sourceProfileId)
    .single();

  // Send email via email service
  await sendEmail({
    to: targetProfile.email,
    subject: `${sourceProfile.full_name} wants to connect`,
    template: 'connection-request',
    data: {
      sourceProfileName: sourceProfile.full_name,
      sourceProfileUrl: `/public-profile/${sourceProfile.slug}`,
    },
  });
}
```

**Integration Points**:
- **File**: `apps/web/src/lib/services/ProfileGraphService.ts` (line 462-502)
- **Purpose**: Email notifications for connection requests ONLY
- **No Message Emails**: Messages do NOT trigger email notifications (by design)

**Future Enhancement**:
- Could add email notifications for messages if user is offline for X minutes
- Would require background job to batch notifications

---

### 8. TOAST NOTIFICATIONS INTEGRATION

**How It Works**:

**Error Handling**:
```typescript
// ChatThread.tsx (line 14)
import { toast } from 'react-hot-toast';

const { mutate: sendMessage } = useMutation({
  mutationFn: sendMessageAPI,
  onError: (error) => {
    toast.error('Failed to send message. Please try again.');
  },
  onSuccess: () => {
    // Silently succeed (no toast for success)
  },
});

// Connection errors
if (!hasConnection) {
  toast.error('You must be connected to message this user');
}
```

**Integration Points**:
- **File**: `apps/web/src/app/components/feature/messages/ChatThread.tsx` (line 14)
- **Purpose**: Error notifications for failed message sends

**Notification Types**:
- Failed message send
- Connection validation errors
- Ably connection errors

**Note**: No success toasts (would be too noisy in a chat interface)

---

### 9. USER DELETION CASCADE BEHAVIOR

**How It Works**:

**When User Deletes Account**:
```typescript
// apps/web/src/app/api/user/delete/route.ts (line 87-90)

// Delete user (cascades to related tables)
await supabase.auth.admin.deleteUser(userId);

// CASCADE deletes occur automatically:
// 1. chat_messages (sender_id, receiver_id ON DELETE CASCADE)
// 2. profile_graph (source_profile_id, target_profile_id ON DELETE CASCADE)
// 3. profiles (id ON DELETE CASCADE)
```

**Database Schema Cascade**:
```sql
-- chat_messages table
sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

-- profile_graph table
source_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
target_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
```

**Integration Points**:
- **File**: `apps/web/src/app/api/user/delete/route.ts` (line 90)
- **Behavior**: All messages sent/received by deleted user are permanently removed
- **No Orphans**: No orphaned messages remain in database

---

## Data Flow Diagrams

### Send Message Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      SEND MESSAGE FLOW                            │
└──────────────────────────────────────────────────────────────────┘

User A Types Message
        ↓
┌─────────────────────────┐
│ CLIENT-SIDE             │
│ 1. Optimistic Update    │
│    status: 'sending'    │
│ 2. React Query Mutation │
└──────────┬──────────────┘
           │
           │ POST /api/messages/send
           ↓
┌──────────────────────────────────────────────────────────────────┐
│ API ROUTE VALIDATION                                              │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Step 1: Auth Check                                         │  │
│ │   - supabase.auth.getUser()                               │  │
│ │   - Verify session valid                                   │  │
│ │   - Return 401 if unauthorized                             │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Step 2: Connection Validation                              │  │
│ │   - Query profile_graph                                    │  │
│ │   - WHERE relationship_type = 'SOCIAL'                     │  │
│ │   - WHERE status = 'ACTIVE'                                │  │
│ │   - WHERE (source=A, target=B) OR (source=B, target=A)     │  │
│ │   - Return 403 if no connection                            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Step 3: Insert Message                                     │  │
│ │   - INSERT INTO chat_messages                              │  │
│ │   - SET sender_id, receiver_id, content, type              │  │
│ │   - SET delivery_status = 'sent'                           │  │
│ │   - RETURN message with ID                                 │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Step 4: Publish to Ably                                    │  │
│ │   - Channel: private-chat:{sorted_user_ids}                │  │
│ │   - Event: message:new                                     │  │
│ │   - Payload: { id, sender_id, content, ... }               │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ REAL-TIME DELIVERY (Ably)                                        │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ User B's Browser                                           │  │
│ │   - Subscribed to private-chat:{sorted_user_ids}           │  │
│ │   - Receives message:new event                             │  │
│ │   - React Query updates cache                              │  │
│ │   - UI shows new message instantly                         │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓ (User B sees message)
┌──────────────────────────────────────────────────────────────────┐
│ READ RECEIPT FLOW                                                │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 1. User B views message (Intersection Observer)            │  │
│ │ 2. POST /api/messages/mark-read                        │  │
│ │ 3. UPDATE chat_messages SET read=true, read_at=NOW()       │  │
│ │ 4. Publish message:read to Ably                            │  │
│ │ 5. User A sees read receipt (✓✓ turns blue)                │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Typing Indicator Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   TYPING INDICATOR FLOW                           │
└──────────────────────────────────────────────────────────────────┘

User A Types in Input Field
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ useAblyTyping Hook (500ms debounce)                             │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ const debouncedStartTyping = useDebouncedCallback(       │   │
│ │   () => channel.publish('typing:start', { userId }),     │   │
│ │   500 // Wait 500ms before publishing                    │   │
│ │ );                                                        │   │
│ └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓ (After 500ms of continuous typing)
┌──────────────────────────────────────────────────────────────────┐
│ ABLY CHANNEL                                                      │
│   Channel: private-chat:{sorted_user_ids}                        │
│   Event: typing:start                                            │
│   Payload: { userId: 'user-a-id' }                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ User B's Browser (Subscription)                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ useChannel(channelName, (message) => {                   │   │
│ │   if (message.name === 'typing:start') {                 │   │
│ │     setIsOtherUserTyping(true);                          │   │
│ │                                                           │   │
│ │     // Auto-clear after 3 seconds                        │   │
│ │     setTimeout(() => {                                   │   │
│ │       setIsOtherUserTyping(false);                       │   │
│ │     }, 3000);                                            │   │
│ │   }                                                       │   │
│ │ });                                                       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ UI Shows: "User A is typing..."                                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓ (User A stops typing OR 3s timeout)
┌──────────────────────────────────────────────────────────────────┐
│ CLEAR TYPING INDICATOR                                           │
│   Event: typing:stop                                             │
│   User B's UI: Remove "typing..." text                           │
└──────────────────────────────────────────────────────────────────┘
```

### Presence Tracking Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRESENCE TRACKING FLOW                         │
└──────────────────────────────────────────────────────────────────┘

User Opens /messages Page
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ useAblyPresence Hook                                             │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ useEffect(() => {                                        │   │
│ │   const presenceChannel = ably.channels.get(             │   │
│ │     `presence:user:${currentUserId}`                     │   │
│ │   );                                                      │   │
│ │                                                           │   │
│ │   // Enter presence                                      │   │
│ │   presenceChannel.presence.enter({                       │   │
│ │     userId: currentUserId,                               │   │
│ │     status: 'online'                                     │   │
│ │   });                                                     │   │
│ │                                                           │   │
│ │   return () => {                                         │   │
│ │     presenceChannel.presence.leave();                    │   │
│ │   };                                                      │   │
│ │ }, [currentUserId]);                                     │   │
│ └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ ABLY PRESENCE CHANNEL                                            │
│   Channel: presence:user:{user_id}                               │
│   Event: presence:enter                                          │
│   Payload: { userId, status: 'online' }                          │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ Other Users' Browsers                                            │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ presenceChannel.presence.subscribe('enter', (member) => {│   │
│ │   setUserStatus(member.clientId, 'online');              │   │
│ │   setLastSeen(member.clientId, null); // Clear last seen │   │
│ │ });                                                       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ UI Shows: 🟢 Online                                              │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓ (User closes tab or goes idle)
┌──────────────────────────────────────────────────────────────────┐
│ PRESENCE LEAVE                                                   │
│   Event: presence:leave                                          │
│   Update last_seen in database: NOW()                            │
│   Other users see: "Last seen 2 minutes ago"                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Authentication & Authorization

1. **Middleware Protection**:
   - All `/messages` routes protected via `middleware.ts`
   - Session validation via Supabase Auth cookies
   - Automatic redirect to login for unauthenticated users

2. **API Route Protection**:
   - Every API endpoint validates `supabase.auth.getUser()`
   - Returns 401 Unauthorized if no valid session
   - Uses `export const dynamic = 'force-dynamic'` for Next.js 15 cookie compatibility

3. **Connection Validation**:
   - Users can ONLY message active SOCIAL connections
   - Bidirectional query checks both source and target
   - Returns 403 Forbidden if no connection exists
   - Prevents spam and unauthorized messaging

4. **Row Level Security (RLS)**:
   - Database policies enforce message access control
   - Users can only view messages they sent or received
   - Users can only send to connections (verified via profile_graph)

### Data Privacy

1. **Message Encryption** (Future Enhancement):
   - Currently messages stored in plain text
   - Could implement E2E encryption via Ably's encryption features
   - Would require key exchange mechanism

2. **Ably Channel Security**:
   - Channel names are deterministic (sorted user IDs)
   - Client-side auth check before subscribing
   - Server-side validation before publishing

3. **User Deletion**:
   - All messages CASCADE deleted when user account deleted
   - No orphaned messages remain
   - Complete data removal

### Rate Limiting (Future Enhancement)

Currently no rate limiting implemented. Consider adding:
- Max X messages per minute per user
- Max Y typing events per minute
- Prevent spam via API rate limiting

---

## Performance Considerations

### Optimizations Implemented

1. **React Query Caching**:
   - Conversation list cached with 5-minute stale time
   - Messages cached per conversation
   - Optimistic updates for instant UI feedback

2. **Ably Optimizations**:
   - Typing indicators debounced (500ms)
   - Typing auto-clear (3 seconds)
   - Presence updates only on enter/leave (not continuous polling)

3. **Database Indexes**:
   - `idx_chat_messages_sender_id` for sender lookups
   - `idx_chat_messages_receiver_id` for receiver lookups
   - `idx_chat_messages_created_at` for chronological ordering
   - `idx_chat_messages_conversation` composite index

4. **Lazy Loading**:
   - Messages loaded in batches (50 at a time)
   - Infinite scroll for older messages
   - Conversation list virtualized for large lists

### Performance Metrics

- **Message Send Latency**: ~200-500ms (API + Ably)
- **Real-Time Delivery**: <100ms (Ably propagation)
- **Typing Indicator Latency**: ~600ms (500ms debounce + 100ms Ably)
- **Presence Update Latency**: ~100-200ms
- **Conversation List Load**: ~300-500ms (with caching)

### Bottlenecks to Monitor

1. **Large Conversation History**:
   - Pagination helps but needs lazy loading optimization
   - Consider archiving old messages after X months

2. **High Message Volume**:
   - Ably has message rate limits
   - Monitor Ably usage and upgrade plan if needed

3. **Presence Tracking at Scale**:
   - Each user has dedicated presence channel
   - 1000s of users = 1000s of channels
   - Consider presence aggregation for large networks

---

## Testing Strategy

### Unit Tests

1. **API Routes**:
   - Test auth validation
   - Test connection validation
   - Test message creation
   - Test read receipts

2. **Custom Hooks**:
   - Test `useAblyTyping` debouncing
   - Test `useAblyPresence` state updates
   - Test cleanup on unmount

3. **Utility Functions**:
   - Test channel naming (sorted user IDs)
   - Test profile image URL generation

### Integration Tests

1. **Send Message Flow**:
   - User A sends message → User B receives in real-time
   - Optimistic UI update → Server confirmation
   - Failed send → Error handling

2. **Typing Indicators**:
   - User A types → User B sees "typing..."
   - User A stops → "typing..." clears after 3s

3. **Presence Tracking**:
   - User A comes online → User B sees "Online"
   - User A closes tab → User B sees "Last seen X ago"

### E2E Tests

1. **Full Conversation Flow**:
   - User A and B connect
   - User A sends message
   - User B receives and reads
   - User A sees read receipt

2. **Connection Validation**:
   - User A tries messaging User C (no connection)
   - Verify 403 error
   - Verify no message sent

---

## Migration Notes

### Version History

- **v4.0** (Initial Release): Basic 1-on-1 messaging
- **v4.1** (Ably Migration): Migrated from Supabase Realtime to Ably
- **v4.2** (Presence & Typing): Added typing indicators and presence tracking
- **v4.3** (Delivery Status): Added delivery status tracking (sending/sent/delivered/read)

### Database Migrations

No explicit migration files found in codebase, but inferred schema:
- `chat_messages` table created (estimated v4.0)
- `profile_graph` table created (migration 061)
- Indexes added for performance (estimated v4.1)

---

## Future Enhancements

### Planned Features

1. **Group Chat Support**:
   - Create `chat_groups` and `chat_group_members` tables
   - Update Ably channel naming for groups
   - Add group admin roles

2. **Message Reactions**:
   - Add `reactions` JSONB column to `chat_messages`
   - Publish reaction events to Ably
   - Render emoji reactions below messages

3. **Message Editing**:
   - Add `edited_at` timestamp
   - API endpoint for editing own messages
   - Show "(edited)" indicator in UI

4. **Message Search**:
   - Full-text search on message content
   - Search across all conversations
   - Highlight search results

5. **Voice Messages**:
   - Record audio via browser API
   - Upload to Supabase Storage
   - Render audio player in chat

6. **File Uploads**:
   - Already supported via `type='file'` and `metadata`
   - Needs UI implementation for file picker

7. **Push Notifications**:
   - Browser notifications for new messages when tab inactive
   - Email notifications for messages when user offline >X minutes

8. **End-to-End Encryption**:
   - Implement E2E encryption via Ably
   - Key exchange mechanism
   - Encrypted message storage

---

## API Reference

### Endpoints

| Route | Method | Description | Auth | Connection Required |
|-------|--------|-------------|------|-------------------|
| `/api/messages/send` | POST | Send message | ✅ | ✅ (SOCIAL, ACTIVE) |
| `/api/messages/conversations` | GET | List conversations | ✅ | ❌ |
| `/api/messages/[userId]` | GET | Fetch conversation history | ✅ | ✅ (implicit) |
| `/api/messages/mark-read` | POST | Mark message as read | ✅ | ❌ |
| `/api/messages/mark-conversation-read` | POST | Mark all messages from user as read | ✅ | ❌ |

### Ably Events

| Event | Channel | Payload | Purpose |
|-------|---------|---------|---------|
| `message:new` | `private-chat:{id1}:{id2}` | `{ id, sender_id, content, ... }` | New message sent |
| `message:read` | `private-chat:{id1}:{id2}` | `{ message_id, read_at }` | Message marked as read |
| `typing:start` | `private-chat:{id1}:{id2}` | `{ userId }` | User started typing |
| `typing:stop` | `private-chat:{id1}:{id2}` | `{ userId }` | User stopped typing |
| `presence:enter` | `presence:user:{userId}` | `{ userId, status: 'online' }` | User came online |
| `presence:leave` | `presence:user:{userId}` | `{ userId }` | User went offline |

---

## File Locations

### Core Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(authenticated)/messages/page.tsx` | Main messages hub (Gold Standard) |
| `apps/web/src/app/components/feature/messages/ChatThread.tsx` | Real-time chat interface |
| `apps/web/src/app/components/feature/messages/ConversationList.tsx` | WhatsApp-style sidebar |
| `apps/web/src/app/hooks/useAblyTyping.tsx` | Typing indicator hook |
| `apps/web/src/app/hooks/useAblyPresence.tsx` | Presence tracking hook |
| `apps/web/src/lib/ably.ts` | Ably client configuration |
| `apps/web/src/lib/api/messages.ts` | Client-side API utilities |
| `apps/web/src/app/api/messages/send/route.ts` | Send message endpoint |
| `apps/web/src/app/api/messages/conversations/route.ts` | Get conversations endpoint |
| `apps/web/src/middleware.ts` | Route protection (line 67) |

---

## Summary of System Integrations

### ✅ Strong Integrations

1. **Auth** - Full authentication/authorization via Supabase Auth + middleware
2. **Profiles** - User data (name, avatar, slug) displayed throughout
3. **Network (profile_graph)** - CRITICAL dependency for message validation
4. **Ably** - Complete real-time infrastructure (messages, typing, presence)
5. **React Query** - State management and optimistic updates
6. **Database (Supabase)** - Message persistence with RLS policies

### ⚠️ Partial Integrations

1. **Email Notifications** - Only for connection requests, NOT messages
2. **Toast Notifications** - Error handling only (no success toasts)
3. **User Deletion** - CASCADE deletes messages on account deletion

### ❌ No Integration Found

1. **Bookings** - No direct integration (only CASCADE delete on user deletion)
2. **Payments/Stripe** - No payment features in messaging
3. **Wiselist** - No collaboration messaging
4. **Group Chat** - Only 1-on-1 messaging supported
5. **Push Notifications** - Not implemented
6. **SMS Notifications** - Not implemented
7. **E2E Encryption** - Not implemented

---

**Last Updated**: 2025-12-12
**Version**: v4.3 (Delivery Status)
**Architecture**: Gold Standard Hub + Ably Real-Time
**Owner**: Backend Team
**For Questions**: See [messages-implementation.md](./messages-implementation.md)
