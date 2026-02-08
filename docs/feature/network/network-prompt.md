# Network Feature - AI Assistant Prompt

**Feature**: Network (Social Connections)
**Version**: v4.6 (Profile Graph Integration)
**Last Updated**: 2025-12-12
**Target Audience**: AI Assistants working on Network feature

---

## Feature Overview

The **Network** feature provides LinkedIn-style professional connections for TutorWise, enabling users to build relationships through connection requests, acceptance/rejection workflows, and bidirectional social relationships. Built on the Profile Graph infrastructure, it leverages `profile_graph` table with `relationship_type='SOCIAL'`.

**Core Capabilities**:
1. Send/receive connection requests with optional messages
2. Accept/reject/remove connections
3. Real-time notifications via Supabase Realtime
4. Email notifications via Resend API
5. Network dashboard with tabs (All, Requests, Sent)
6. Search, sort, pagination
7. CSV export

---

## System Context

### Database Table

**profile_graph** (shared infrastructure):
```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY,
  source_profile_id UUID REFERENCES profiles(id),
  target_profile_id UUID REFERENCES profiles(id),
  relationship_type TEXT CHECK (relationship_type IN ('SOCIAL', 'TUTOR_CLIENT', 'AGENT_TUTOR')),
  status TEXT CHECK (status IN ('PENDING', 'ACTIVE', 'BLOCKED', 'EXPIRED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Network-specific query**:
```sql
-- Fetch all SOCIAL connections for user
SELECT * FROM profile_graph
WHERE relationship_type = 'SOCIAL'
AND (source_profile_id = $userId OR target_profile_id = $userId)
ORDER BY created_at DESC;
```

### Status Flow

```
PENDING → ACTIVE (accepted)
PENDING → BLOCKED (rejected)
ACTIVE → DELETED (removed)
```

### Integration Points

1. **Profile Graph Service**: Underlying data layer
2. **Email Service (Resend)**: Connection notifications
3. **Messages Feature**: "Message" button on ConnectionCard
4. **Public Profile**: "Connect" button display

---

## Key Functions

### Function 1: getMyConnections() (Client)

**Purpose**: Fetch all connections for authenticated user

**Implementation**:
```typescript
export async function getMyConnections(): Promise<Connection[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      target_profile_id,
      status,
      metadata,
      created_at,
      source:source_profile_id(id, full_name, email, avatar_url),
      target:target_profile_id(id, full_name, email, avatar_url)
    `)
    .eq('relationship_type', 'SOCIAL')
    .or(`source_profile_id.eq.${user.id},target_profile_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  // Map to Connection format
  return data.map(link => ({
    id: link.id,
    requester_id: link.source_profile_id,
    receiver_id: link.target_profile_id,
    status: link.status === 'PENDING' ? 'pending' :
            link.status === 'ACTIVE' ? 'accepted' : 'rejected',
    message: link.metadata?.message,
    created_at: link.created_at,
    requester: link.source,
    receiver: link.target,
  }));
}
```

### Function 2: POST /api/network/accept (Server)

**Purpose**: Accept connection request and send email

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { connection_id } = await request.json();

  // Verify user is target
  const { data: connection } = await supabase
    .from('profile_graph')
    .select('*, source:source_profile_id(email, full_name)')
    .eq('id', connection_id)
    .single();

  if (!connection || connection.target_profile_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update status to ACTIVE
  await supabase
    .from('profile_graph')
    .update({
      status: 'ACTIVE',
      metadata: { ...connection.metadata, accepted_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection_id);

  // Send confirmation email
  await resend.emails.send({
    from: 'TutorWise <notifications@tutorwise.com>',
    to: connection.source.email,
    subject: 'Connection Request Accepted',
    html: `<p>${user.user_metadata.full_name} accepted your connection request.</p>`,
  });

  return NextResponse.json({ success: true });
}
```

### Function 3: useConnectionsRealtime() (Hook)

**Purpose**: Subscribe to real-time connection updates

**Implementation**:
```typescript
export function useConnectionsRealtime({ userId, enabled, onInsert, onUpdate }) {
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel('network-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profile_graph',
        filter: `target_profile_id=eq.${userId}`,
      }, onInsert)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profile_graph',
      }, onUpdate)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, enabled]);
}
```

---

## Common Tasks

### Task 1: Display Network Dashboard

```typescript
// /network page component

export default function NetworkPage() {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'pending-received' | 'pending-sent'>('all');

  // Fetch connections
  const { data: connections } = useQuery({
    queryKey: ['connections', profile?.id],
    queryFn: getMyConnections,
  });

  // Real-time updates
  useConnectionsRealtime({
    userId: profile?.id,
    enabled: !!profile,
    onInsert: () => {
      toast.success('New connection request!');
      queryClient.invalidateQueries(['connections']);
    },
    onUpdate: () => {
      queryClient.invalidateQueries(['connections']);
    },
  });

  // Filter by tab
  const filteredConnections = connections.filter((c) => {
    switch (activeTab) {
      case 'all':
        return c.status === 'accepted';
      case 'pending-received':
        return c.status === 'pending' && c.receiver_id === profile.id;
      case 'pending-sent':
        return c.status === 'pending' && c.requester_id === profile.id;
    }
  });

  return (
    <HubPageLayout
      header={<HubHeader title="Network" />}
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Connections' },
            { id: 'pending-received', label: 'Requests' },
            { id: 'pending-sent', label: 'Sent' },
          ]}
          onTabChange={setActiveTab}
        />
      }
    >
      {filteredConnections.map((connection) => (
        <ConnectionCard key={connection.id} connection={connection} />
      ))}
    </HubPageLayout>
  );
}
```

### Task 2: Send Connection Request

```typescript
// POST /api/network/request

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { target_profile_id, message } = await request.json();

  // Check for existing connection
  const { data: existing } = await supabase
    .from('profile_graph')
    .select('id')
    .eq('relationship_type', 'SOCIAL')
    .eq('source_profile_id', user.id)
    .eq('target_profile_id', target_profile_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Connection already exists' }, { status: 409 });
  }

  // Create connection request
  const { data: connection } = await supabase
    .from('profile_graph')
    .insert({
      source_profile_id: user.id,
      target_profile_id,
      relationship_type: 'SOCIAL',
      status: 'PENDING',
      metadata: { message, initiated_at: new Date().toISOString() },
    })
    .select()
    .single();

  // Send email notification
  await resend.emails.send({
    from: 'TutorWise <notifications@tutorwise.com>',
    to: targetEmail,
    subject: 'New Connection Request',
    html: `<p>${user.user_metadata.full_name} sent you a connection request.</p>`,
  });

  return NextResponse.json({ success: true, connection_id: connection.id });
}
```

### Task 3: Accept Connection with Optimistic UI

```typescript
// Client-side mutation with optimistic update

const acceptMutation = useMutation({
  mutationFn: acceptConnection,
  onMutate: async (connectionId) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['connections']);

    // Snapshot current data
    const previous = queryClient.getQueryData(['connections']);

    // Optimistically update
    queryClient.setQueryData(['connections'], (old) =>
      old.map((c) => (c.id === connectionId ? { ...c, status: 'accepted' } : c))
    );

    return { previous };
  },
  onError: (err, vars, context) => {
    // Rollback on error
    queryClient.setQueryData(['connections'], context.previous);
    toast.error('Failed to accept connection');
  },
  onSuccess: () => {
    toast.success('Connection accepted!');
  },
  onSettled: () => {
    queryClient.invalidateQueries(['connections']);
  },
});
```

### Task 4: Display Connect Button on Public Profile

```typescript
// Public profile page component

const { data: connectionStatus } = useQuery({
  queryKey: ['connection-status', profileId, currentUserId],
  queryFn: async () => {
    const { data } = await supabase
      .from('profile_graph')
      .select('status')
      .eq('relationship_type', 'SOCIAL')
      .or(`source_profile_id.eq.${currentUserId},target_profile_id.eq.${currentUserId}`)
      .or(`source_profile_id.eq.${profileId},target_profile_id.eq.${profileId}`)
      .single();

    return data?.status || null;
  },
});

if (connectionStatus === 'ACTIVE') {
  return <Badge>Connected</Badge>;
} else if (connectionStatus === 'PENDING') {
  return <Badge variant="secondary">Pending</Badge>;
} else {
  return <Button onClick={handleConnect}>Connect</Button>;
}
```

---

## Testing Checklist

- [ ] **Send Request**: POST /api/network/request creates PENDING profile_graph record
- [ ] **Email Sent**: Resend API delivers connection request email
- [ ] **Accept Request**: POST /api/network/accept updates status to ACTIVE
- [ ] **Real-time**: Toast notification appears instantly on recipient's dashboard
- [ ] **Dashboard Tabs**: All/Requests/Sent tabs filter correctly
- [ ] **Search**: Search by name/email works
- [ ] **CSV Export**: Downloads CSV with connection data
- [ ] **Duplicate Prevention**: Sending duplicate request returns 409 error
- [ ] **RLS Policies**: Users can only view/modify their own connections

---

## Security Considerations

1. **RLS Policies**: Users can only view connections where they are source or target
2. **Authorization**: Verify user is target before accepting connection
3. **Rate Limiting**: Limit connection requests to 10/minute per user
4. **UUID Validation**: Validate all UUIDs before database queries
5. **Duplicate Prevention**: UNIQUE constraint on (source, target, relationship_type)

---

## Performance Optimization

1. **Indexed Queries**: profile_graph has indexes on source_profile_id, target_profile_id, relationship_type
2. **Real-time Efficiency**: Subscribe only to relevant events (INSERT/UPDATE for target_profile_id = currentUser)
3. **Optimistic UI**: Update local state immediately, rollback on error
4. **Query Caching**: React Query caches connections for 2 minutes (staleTime)
5. **Pagination**: Load 4 connections per page (configurable)

---

**Last Updated**: 2025-12-12
**Version**: v4.6
**Maintainer**: User Engagement Team
