# Network Feature - Implementation Guide

**Version**: v4.6 (Profile Graph Integration)
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Setup Instructions](#setup-instructions)
3. [Common Tasks](#common-tasks)
4. [API Reference](#api-reference)
5. [Component Reference](#component-reference)
6. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/network/
│   └─ page.tsx                         # Network dashboard with tabs, search, pagination
│
├─ app/components/feature/network/
│   ├─ ConnectionCard.tsx               # Individual connection card
│   ├─ ConnectionRequestModal.tsx       # Modal to search and send requests
│   ├─ NetworkStatsWidget.tsx           # Sidebar widget with stats
│   ├─ NetworkHelpWidget.tsx            # Sidebar help content
│   ├─ NetworkTipWidget.tsx             # Tips for building network
│   ├─ NetworkVideoWidget.tsx           # Video guide embed
│   ├─ NetworkSkeleton.tsx              # Loading state
│   └─ NetworkError.tsx                 # Error state
│
├─ lib/api/network.ts                   # Client-side API functions
│   ├─ getMyConnections()               # Fetch all connections
│   ├─ acceptConnection()               # Accept request
│   ├─ rejectConnection()               # Reject request
│   └─ removeConnection()               # Remove connection
│
└─ hooks/useConnectionsRealtime.ts      # Real-time subscription hook

apps/api/
└─ app/api/network/
    ├─ send/route.ts                    # POST - Send connection request
    ├─ accept/route.ts                  # POST - Accept request
    ├─ reject/route.ts                  # POST - Reject request
    └─ remove/route.ts                  # DELETE - Remove connection
```

---

## Setup Instructions

### Prerequisites
- Supabase configured with `profile_graph` table
- Resend API key for email notifications
- Next.js 14+
- React Query (TanStack Query)

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
```

### Database Setup

```sql
-- profile_graph table should already exist from profile-graph feature
-- Verify it has SOCIAL relationship_type support:
SELECT * FROM profile_graph WHERE relationship_type = 'SOCIAL' LIMIT 1;

-- If needed, add indexes:
CREATE INDEX IF NOT EXISTS idx_profile_graph_source ON profile_graph(source_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_graph_target ON profile_graph(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_graph_relationship_type ON profile_graph(relationship_type);
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Navigate to network dashboard
open http://localhost:3000/network
```

---

## Common Tasks

### Task 1: Fetch User's Connections

```typescript
// apps/web/src/lib/api/network.ts

import { createClient } from '@/utils/supabase/client';
import type { Connection } from '@/app/components/feature/network/ConnectionCard';

export async function getMyConnections(): Promise<Connection[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Query profile_graph for SOCIAL relationships
  const { data, error } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      target_profile_id,
      status,
      metadata,
      created_at,
      source:source_profile_id(id, full_name, email, avatar_url, bio),
      target:target_profile_id(id, full_name, email, avatar_url, bio)
    `)
    .eq('relationship_type', 'SOCIAL')
    .or(`source_profile_id.eq.${user.id},target_profile_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map profile_graph records to legacy Connection format
  const mappedConnections: Connection[] = (data || []).map((link: any) => {
    const legacyStatus =
      link.status === 'PENDING' ? 'pending' :
      link.status === 'ACTIVE' ? 'accepted' :
      'rejected';

    return {
      id: link.id,
      requester_id: link.source_profile_id,
      receiver_id: link.target_profile_id,
      status: legacyStatus as 'pending' | 'accepted' | 'rejected',
      message: link.metadata?.message || undefined,
      created_at: link.created_at,
      requester: Array.isArray(link.source) ? link.source[0] : link.source,
      receiver: Array.isArray(link.target) ? link.target[0] : link.target,
    };
  });

  return mappedConnections;
}
```

### Task 2: Accept Connection Request (API Route)

```typescript
// apps/api/app/api/network/accept/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { connection_id } = body;

  // Fetch connection to verify user is target
  const { data: connection, error: fetchError } = await supabase
    .from('profile_graph')
    .select('*, source:source_profile_id(email, full_name)')
    .eq('id', connection_id)
    .single();

  if (fetchError || !connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  if (connection.target_profile_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update status to ACTIVE
  const { error: updateError } = await supabase
    .from('profile_graph')
    .update({
      status: 'ACTIVE',
      metadata: {
        ...connection.metadata,
        accepted_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send confirmation email to requester
  try {
    await resend.emails.send({
      from: 'TutorWise <notifications@tutorwise.com>',
      to: connection.source.email,
      subject: `${user.user_metadata.full_name} accepted your connection request`,
      html: `<p>Great news! ${user.user_metadata.full_name} has accepted your connection request.</p>`,
    });
  } catch (emailError) {
    console.error('Email send failed:', emailError);
    // Don't fail the request if email fails
  }

  return NextResponse.json({ success: true });
}
```

### Task 3: Real-time Subscription Hook

```typescript
// apps/web/src/app/hooks/useConnectionsRealtime.ts

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useConnectionsRealtime({
  userId,
  enabled,
  onInsert,
  onUpdate,
  onDelete,
}: {
  userId: string;
  enabled: boolean;
  onInsert?: () => void;
  onUpdate?: (payload: any) => void;
  onDelete?: () => void;
}) {
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel('profile-graph-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profile_graph',
        filter: `target_profile_id=eq.${userId}`,
      }, () => {
        if (onInsert) onInsert();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profile_graph',
        filter: `source_profile_id=eq.${userId},target_profile_id=eq.${userId}`,
      }, (payload) => {
        if (onUpdate) onUpdate(payload);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'profile_graph',
      }, () => {
        if (onDelete) onDelete();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, onInsert, onUpdate, onDelete, supabase]);
}
```

### Task 4: Network Dashboard Component

```typescript
// apps/web/src/app/(authenticated)/network/page.tsx (excerpt)

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyConnections, acceptConnection } from '@/lib/api/network';
import { useConnectionsRealtime } from '@/app/hooks/useConnectionsRealtime';

export default function NetworkPage() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'pending-received' | 'pending-sent'>('all');

  // Fetch connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections', profile?.id],
    queryFn: getMyConnections,
    enabled: !!profile,
    staleTime: 2 * 60 * 1000,
  });

  // Real-time subscriptions
  useConnectionsRealtime({
    userId: profile?.id || '',
    enabled: !!profile,
    onInsert: () => {
      toast.success('New connection request received!');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onUpdate: (payload) => {
      if (payload.new.status === 'ACTIVE') {
        toast.success('Connection accepted!');
      }
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  // Accept connection mutation
  const acceptMutation = useMutation({
    mutationFn: acceptConnection,
    onSuccess: () => {
      toast.success('Connection accepted!');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: () => {
      toast.error('Failed to accept connection');
    },
  });

  // Filter connections by active tab
  const filteredConnections = useMemo(() => {
    if (!profile) return [];

    return connections.filter((connection) => {
      switch (activeTab) {
        case 'all':
          return connection.status === 'accepted';
        case 'pending-received':
          return connection.status === 'pending' && connection.receiver_id === profile.id;
        case 'pending-sent':
          return connection.status === 'pending' && connection.requester_id === profile.id;
        default:
          return false;
      }
    });
  }, [connections, activeTab, profile]);

  return (
    <HubPageLayout
      header={<HubHeader title="Network" />}
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Connections', active: activeTab === 'all' },
            { id: 'pending-received', label: 'Requests', active: activeTab === 'pending-received' },
            { id: 'pending-sent', label: 'Sent', active: activeTab === 'pending-sent' },
          ]}
          onTabChange={(id) => setActiveTab(id)}
        />
      }
    >
      {filteredConnections.map((connection) => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          currentUserId={profile?.id}
          onAccept={() => acceptMutation.mutate(connection.id)}
        />
      ))}
    </HubPageLayout>
  );
}
```

---

## API Reference

### POST /api/network/send
**Purpose**: Send connection request

**Request**:
```json
{
  "target_profile_id": "uuid",
  "message": "Optional message"
}
```

**Response (200)**:
```json
{
  "success": true,
  "connection_id": "uuid"
}
```

**Error (409)**: Connection already exists

### POST /api/network/accept
**Purpose**: Accept connection request

**Request**:
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

### POST /api/network/reject
**Purpose**: Reject connection request

**Request**:
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

### DELETE /api/network/remove
**Purpose**: Remove connection

**Request**:
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

---

## Component Reference

### ConnectionCard

**Props**:
```typescript
interface ConnectionCardProps {
  connection: Connection;
  currentUserId: string;
  variant: 'accepted' | 'pending-received' | 'pending-sent';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onRemove?: (id: string) => void;
  onMessage?: (userId: string) => void;
}
```

**Usage**:
```tsx
<ConnectionCard
  connection={connection}
  currentUserId={profile.id}
  variant="pending-received"
  onAccept={handleAccept}
  onReject={handleReject}
/>
```

### ConnectionRequestModal

**Props**:
```typescript
interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Usage**:
```tsx
<ConnectionRequestModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={() => {
    queryClient.invalidateQueries(['connections']);
  }}
/>
```

---

## Testing

### Unit Tests

```typescript
// network.test.ts
import { getMyConnections, acceptConnection } from '@/lib/api/network';

describe('Network API', () => {
  it('should fetch connections', async () => {
    const connections = await getMyConnections();
    expect(Array.isArray(connections)).toBe(true);
  });

  it('should accept connection', async () => {
    await acceptConnection('connection-id');
    // Verify status updated to ACTIVE
  });
});
```

### Integration Tests

```typescript
describe('Network Dashboard', () => {
  it('should display all connections on All tab', async () => {
    render(<NetworkPage />);
    expect(screen.getByText('All Connections')).toBeInTheDocument();
  });

  it('should filter connections by tab', async () => {
    render(<NetworkPage />);
    fireEvent.click(screen.getByText('Requests'));
    // Verify only pending-received connections shown
  });
});
```

### Manual Testing

1. **Send Request**: Navigate to `/network`, click "Add Connection", search for user, send request
2. **Accept Request**: As recipient, go to "Requests" tab, click "Accept"
3. **Reject Request**: Click "Reject" instead
4. **Remove Connection**: On "All Connections" tab, click "Remove"
5. **Real-time**: Open two browser tabs, send request from one, verify toast appears in other

---

**Last Updated**: 2025-12-12
**Version**: v4.6
**Maintainer**: User Engagement Team
