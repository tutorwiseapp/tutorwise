# Messages

**Status**: Active
**Last Code Update**: 2025-12-12
**Last Doc Update**: 2025-12-12
**Priority**: High (Tier 1 - Critical)
**Architecture**: Gold Standard Hub (HubPageLayout)

## Quick Links
- [AI Prompt](./messages-prompt.md)
- [Solution Design](./messages-solution-design.md)
- [Implementation Guide](./messages-implementation.md)

## Overview

The messages feature is a real-time chat system built with Ably for instant messaging between users. Features WhatsApp-style UI with conversation list, typing indicators, presence tracking, and delivery status. Built using the Gold Standard Hub architecture with React Query for state management.

## Key Features

- **Real-Time Messaging**: Ably-powered instant message delivery
- **Typing Indicators**: See when other user is typing (3s timeout)
- **Presence Tracking**: Online/offline status with last seen
- **Read Receipts**: Track message delivery and read status
- **Message Types**: Text, image, file, and system messages
- **Connection Validation**: Via profile_graph table for security
- **WhatsApp-Style UI**: 2-pane split layout (conversations + thread)
- **Optimistic Updates**: Instant UI feedback with React Query

## Component Architecture

### Main Hub Page
- [page.tsx](../../../apps/web/src/app/(authenticated)/messages/page.tsx) - Gold Standard Hub

### Core Components (6 total)
- **ChatThread.tsx** - Real-time chat interface with message list
- **ConversationList.tsx** - WhatsApp-style conversation sidebar
- **InboxStatsWidget.tsx** - Message statistics
- **MessageHelpWidget.tsx** - Help/support widget
- **MessageTipWidget.tsx** - Usage tips
- **MessagesSkeleton.tsx** - Loading state

## Routes

### Main Route
- `/messages` - Hub page with 2-pane layout (authenticated)
- `/messages?conversationId=[id]` - Open specific conversation

### API Endpoints
1. `GET /api/messages` - Fetch messages for conversation
2. `POST /api/messages` - Send new message
3. `PATCH /api/messages/:id` - Mark message as read
4. `GET /api/conversations` - Fetch user conversations

## Database Tables

### Primary Table: `chat_messages`
**Key Fields**:
- IDs: `id`, `sender_id`, `receiver_id`
- Content: `type` (text/image/file/system), `content`, `metadata`
- Status: `read`, `delivery_status` (sending/sent/delivered/read/failed)
- Timestamps: `created_at`, `updated_at`

**Metadata Structure** (for file/image types):
```json
{
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "fileUrl": "https://...",
  "imageUrl": "https://..." // for image type
}
```

### Supporting Table: `profile_graph`
**Purpose**: Validate connections between users before allowing messages

**Key Fields**:
- `profile_id`, `connected_profile_id`
- `connection_type` (tutor_client, agent_tutor, etc.)
- `status` (active, inactive)

## Real-Time Architecture

### Ably Integration

**Channel Naming Convention**:
```typescript
// Private chat between two users
privateChat: (userId1, userId2) => {
  const sortedIds = [userId1, userId2].sort();
  return `private-chat:${sortedIds[0]}:${sortedIds[1]}`;
}

// User presence
userPresence: (userId) => `presence:user:${userId}`;
```

**Events Published**:
1. `message:new` - New message sent
2. `message:read` - Message marked as read
3. `typing:start` - User started typing
4. `typing:stop` - User stopped typing
5. `presence:enter` - User came online
6. `presence:leave` - User went offline

### Custom Hooks

**useAblyTyping** (apps/web/src/app/hooks/useAblyTyping.tsx)
- Manages typing indicator state
- Auto-clears after 3 seconds of inactivity
- Debounces typing events (500ms)

```typescript
const { isOtherUserTyping, startTyping, stopTyping } = useAblyTyping(
  conversationId,
  currentUserId,
  otherUserId
);
```

**useAblyPresence** (apps/web/src/app/hooks/useAblyPresence.tsx)
- Tracks user online/offline status
- Shows last seen timestamp
- Updates in real-time

```typescript
const { isOnline, lastSeen } = useAblyPresence(targetUserId);
```

## Key Workflows

### 1. Send Message Flow
```
User types message → React Query mutation →
Optimistic UI update (status: sending) →
POST /api/messages → Insert to database →
Publish to Ably channel (message:new) →
Receiver gets real-time update →
Update status: sent → delivered → read
```

### 2. Typing Indicator Flow
```
User starts typing → startTyping() called →
Publish typing:start to Ably →
Other user sees "typing..." →
After 500ms no typing → Auto publish typing:stop →
Clear typing indicator on other user's UI
```

### 3. Presence Tracking Flow
```
User opens messages → Join presence channel →
Publish presence:enter →
Other users see "Online" status →
User closes/idle → Publish presence:leave →
Other users see "Last seen 2m ago"
```

### 4. Mark as Read Flow
```
User views message → PATCH /api/messages/:id →
Update read=true, delivery_status='read' →
Publish message:read to Ably →
Sender sees read receipt
```

## Message Types

1. **text** - Plain text messages
2. **image** - Image messages with URL in metadata
3. **file** - File attachments with name/size/URL in metadata
4. **system** - System-generated messages (e.g., "Booking confirmed")

## Delivery Status

1. **sending** - Optimistic UI state (not yet sent)
2. **sent** - Message sent to server
3. **delivered** - Message delivered to recipient (Ably confirmed)
4. **read** - Message read by recipient
5. **failed** - Message failed to send (retry available)

## UI Layout (WhatsApp-Style)

### Desktop (2-Pane Split)
```
┌────────────────────────────────────────┐
│ Conversations │ Chat Thread            │
│ ───────────── │ ──────────────────────│
│ • User 1      │ Message 1              │
│ • User 2      │ Message 2              │
│ • User 3      │ [Typing indicator]     │
│               │                        │
│               │ [Input box]            │
└────────────────────────────────────────┘
```

### Mobile (Single Pane)
```
Conversation List → Select user → Chat Thread
← Back button to return to list
```

## System Integrations

The messages system integrates with **6 major platform features**:

1. **Auth** - Full authentication/authorization via Supabase Auth + middleware
2. **Profiles** - User data (name, avatar, slug) displayed throughout chat
3. **Network (profile_graph)** - CRITICAL dependency for message validation (SOCIAL connections only)
4. **Ably Real-Time** - Complete real-time infrastructure (messages, typing, presence)
5. **Supabase Realtime** - Connection request notifications (NOT messages)
6. **User Deletion** - CASCADE deletes all messages on account deletion

See [messages-solution-design.md](./messages-solution-design.md) for detailed integration documentation.

## Technology Stack

- **Ably Chat** (@ably/chat) - High-level messaging API
- **Ably Realtime** (ably) - Low-level pub/sub for typing and presence
- **Supabase Database** - Message persistence with RLS policies
- **React Query** - State management and optimistic updates
- **Supabase Storage** - File/image uploads (future)
- **Next.js 14+ App Router** - Gold Standard Hub architecture

## Connection Validation

Messages are only allowed between connected users:
```typescript
// Validate before sending
const hasConnection = await checkConnection(senderId, receiverId);
if (!hasConnection) {
  throw new Error('No connection between users');
}
```

**Valid Connections** (via profile_graph):
- Tutor ↔ Client (active booking)
- Agent ↔ Tutor (active referral)
- Agent ↔ Client (active job)

## Recent Features

### Typing Indicators (v4.2)
- Real-time "typing..." indicator
- Auto-clear after 3 seconds
- Debounced to reduce Ably calls

### Presence Tracking (v4.2)
- Online/offline status
- Last seen timestamps
- Real-time updates

### Delivery Status (v4.3)
- Track message journey: sending → sent → delivered → read
- Visual indicators in UI
- Failed message retry

## User Roles

### All Roles
- Send/receive messages
- See typing indicators
- View presence status
- Upload files/images
- Mark messages as read

## Status

- [x] Solution design documented
- [x] Implementation guide complete
- [x] AI prompt context complete
- [x] Real-time architecture documented
- [x] Custom hooks documented
- [x] Ably integration documented

---

**Last Updated**: 2025-12-12
**Version**: v4.3 (Delivery Status)
**Architecture**: Gold Standard Hub + Ably Real-Time
**For Questions**: See [implementation.md](./implementation.md)
