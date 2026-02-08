# Network (Social Connections)

**Status**: Active (v4.6)
**Last Updated**: 2025-12-12
**Priority**: Medium (Tier 2 - User Engagement)
**Architecture**: Social Connection Graph via Profile Graph

## Quick Links
- [Solution Design](./network-solution-design.md) - Complete architecture
- [Implementation Guide](./network-implementation.md) - Code examples
- [AI Prompt Context](./network-prompt.md) - AI assistant guidance

---

## Overview

The **Network** feature enables users to build professional connections (tutors ↔ clients, agents ↔ tutors) through a LinkedIn-style connection system. Built on the Profile Graph infrastructure (v4.6), it provides connection requests, bidirectional relationships, real-time updates, and network visualization.

**Key Capabilities**:
- Send and receive connection requests with optional messages
- Accept/reject/remove connections
- Real-time notifications via Supabase Realtime
- Network analytics (connection growth, mutual connections)
- Email notifications via Resend API
- CSV export of connections

---

## Architecture

### Core Components

1. **Profile Graph Integration**: Uses `profile_graph` table with `relationship_type='SOCIAL'`
2. **Status Flow**: PENDING → ACTIVE (accepted) or BLOCKED (rejected)
3. **Bidirectional Links**: Connections are symmetric (if A connects to B, B is connected to A)
4. **Real-time Subscriptions**: Live updates via Supabase Realtime
5. **Hub Layout**: Integrated into Hub architecture with HubPageLayout, HubTabs, HubSidebar

### Database Schema

**profile_graph** table (shared infrastructure):
```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'SOCIAL' for network connections
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'BLOCKED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profile_graph_source ON profile_graph(source_profile_id);
CREATE INDEX idx_profile_graph_target ON profile_graph(target_profile_id);
CREATE INDEX idx_profile_graph_relationship_type ON profile_graph(relationship_type);
CREATE INDEX idx_profile_graph_status ON profile_graph(status);
```

**Metadata Example**:
```json
{
  "message": "Hi! I'd love to connect and discuss tutoring opportunities.",
  "source": "profile_card",
  "initiated_at": "2025-12-12T10:30:00Z"
}
```

---

## Key Features

### 1. Connection Request Flow
```
User A (Tutor) → "Connect" button → User B (Client)
↓
Create profile_graph record:
  - source_profile_id: A
  - target_profile_id: B
  - relationship_type: 'SOCIAL'
  - status: 'PENDING'
↓
Send email to User B via Resend API
↓
User B receives notification (real-time + email)
↓
User B: Accept → status = 'ACTIVE' (bidirectional connection established)
    OR
User B: Reject → status = 'BLOCKED'
```

### 2. Network Dashboard

**Location**: `/network`

**Tabs**:
- **All Connections**: Shows all ACTIVE connections (status='ACTIVE')
- **Requests**: Pending requests received (status='PENDING', target_profile_id=currentUser)
- **Sent**: Pending requests sent (status='PENDING', source_profile_id=currentUser)

**Features**:
- Search by name/email
- Sort by newest, oldest, name (A-Z/Z-A)
- Pagination (4 items per page)
- Export to CSV

### 3. Real-time Updates

Uses **Supabase Realtime** subscriptions:
```typescript
// Listen for profile_graph changes
supabase
  .channel('network-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'profile_graph',
    filter: `target_profile_id=eq.${userId}`,
  }, (payload) => {
    toast.success('New connection request received!');
    refetchConnections();
  })
  .subscribe();
```

### 4. Connection Actions

**Accept Connection**:
- Updates profile_graph record: `status='PENDING'` → `status='ACTIVE'`
- Sends confirmation email to requester

**Reject Connection**:
- Updates profile_graph record: `status='PENDING'` → `status='BLOCKED'`

**Remove Connection**:
- Deletes profile_graph record (soft delete via status change in future)

---

## Workflows

### Workflow 1: Send Connection Request

**Input**: Target user ID, optional message
**Process**:
1. User clicks "Connect" on another user's profile or in ConnectionRequestModal
2. Frontend calls `/api/network/request` (POST)
3. Backend (ProfileGraphService):
   - Validates user authentication
   - Checks for existing connection (prevent duplicates)
   - Creates profile_graph record with status='PENDING', relationship_type='SOCIAL'
   - Sends email notification via Resend API
4. Real-time update triggers toast notification for recipient

**Output**: Connection request created, email sent

### Workflow 2: Accept Connection Request

**Input**: Connection ID
**Process**:
1. User clicks "Accept" on pending request card
2. Frontend calls `/api/network/accept` (POST)
3. Backend (ProfileGraphService):
   - Validates recipient is target_profile_id
   - Updates status from 'PENDING' to 'ACTIVE'
   - Sends confirmation email to requester
4. Real-time update triggers UI refresh

**Output**: Bidirectional connection established

### Workflow 3: View Network Dashboard

**Input**: User authentication
**Process**:
1. User navigates to `/network`
2. Frontend calls `getMyConnections()` (direct Supabase query)
3. Query fetches all profile_graph records where:
   - relationship_type='SOCIAL'
   - source_profile_id=currentUser OR target_profile_id=currentUser
4. Maps profile_graph status to legacy Connection format:
   - PENDING → pending
   - ACTIVE → accepted
   - BLOCKED → rejected
5. Real-time subscription listens for changes

**Output**: Network dashboard with tabs, search, sort, pagination

---

## Integration Points

### 1. Public Profile (`/public-profile/[id]`)
- **Connect Button**: Displays if not connected, replaces with "Connected" badge if ACTIVE connection exists

### 2. Messages (`/messages`)
- **Integration**: "Message" button on ConnectionCard opens Ably-powered chat with connected user

### 3. Profile Graph (`profile_graph` table)
- **Shared Infrastructure**: Network uses profile_graph as foundation, enabling future relationship types (TUTOR_CLIENT, AGENT_TUTOR, etc.)

---

## API Routes

### POST `/api/network/request`
**Purpose**: Create connection request

**Body**:
```json
{
  "target_profile_id": "uuid",
  "message": "Optional connection message"
}
```

**Response (200)**:
```json
{
  "success": true,
  "connection_id": "uuid"
}
```

### POST `/api/network/accept`
**Purpose**: Accept connection request

**Body**:
```json
{
  "connection_id": "uuid"
}
```

**Response (200)**:
```json
{
  "success": true
}
```

### POST `/api/network/reject`
**Purpose**: Reject connection request

### DELETE `/api/network/remove`
**Purpose**: Remove existing connection

---

## Testing

### Manual Testing
1. **Send Request**: Navigate to another user's profile, click "Connect", verify email sent
2. **Accept Request**: As recipient, go to `/network`, click "Accept", verify status changes to ACTIVE
3. **Reject Request**: Click "Reject", verify status changes to BLOCKED
4. **Real-time**: Open two browser tabs (different users), send request, verify toast notification appears instantly
5. **CSV Export**: Go to `/network`, click "Export CSV", verify file downloads with correct data

### Automated Testing
```typescript
describe('Network API', () => {
  it('should send connection request', async () => {
    const response = await fetch('/api/network/request', {
      method: 'POST',
      body: JSON.stringify({ target_profile_id: 'uuid' }),
    });
    expect(response.status).toBe(200);
  });

  it('should accept connection request', async () => {
    const response = await fetch('/api/network/accept', {
      method: 'POST',
      body: JSON.stringify({ connection_id: 'uuid' }),
    });
    expect(response.status).toBe(200);
  });
});
```

---

## Performance

- **Dashboard Load**: <200ms (indexed queries on profile_graph)
- **Real-time Latency**: <100ms (Supabase Realtime)
- **Email Delivery**: ~1-2 seconds (Resend API)

---

## Future Enhancements

- **Connection Groups**: Organize connections into custom groups (e.g., "High Priority Clients")
- **Mutual Connection Discovery**: "People You May Know" based on mutual connections
- **Network Visualization**: Interactive graph view of connection network
- **Invite by Email**: Send connection invites to non-users

---

**Last Updated**: 2025-12-12
**Version**: v4.6
**Maintainer**: User Engagement Team
