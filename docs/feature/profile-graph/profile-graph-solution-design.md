# Profile Graph - Solution Design

**Version**: v4.6 (Unified Relationship Management)
**Date**: 2025-12-12
**Status**: Active
**Target Audience**: Senior Engineers, System Architects

---

## Executive Summary

**Profile Graph** is TutorWise's unified relationship management system that consolidates all user-to-user connections into a single `profile_graph` table. This architecture replaces the isolated `connections` table and provides the foundation for Social Links, Guardian Links, Booking History, and Agent Relationships.

**Business Impact**:
- **Single Source of Truth**: One table for all relationships reduces complexity
- **Performance**: <5ms relationship queries via 6 strategic indexes
- **Extensibility**: JSONB metadata enables domain-specific customization
- **Data Integrity**: Constraints prevent self-links and duplicate relationships
- **Security**: RLS policies ensure users only access their own relationships

**Version**: v4.6 replaces the old connections table with a typed, directed graph structure

---

## Problem Statement

### Before Profile Graph (Pre-v4.6)

**Fragmented Relationship Data**:
```
connections table (Social only)
├── user_id → connected_user_id
├── status (pending/accepted)
└── LIMITATION: Only handles social connections

client_student_links (Planned, not implemented)
├── parent_id → student_id
└── LIMITATION: Requires separate table

booking history (Implicit in bookings table)
├── client_id, tutor_id fields in bookings
└── LIMITATION: No explicit relationship tracking

agent relationships (Scattered across multiple tables)
├── referral_codes in bookings
└── LIMITATION: No unified attribution model
```

**Problems**:
1. **Data Duplication**: Similar relationship patterns implemented separately
2. **Query Complexity**: Need to JOIN multiple tables for relationship analysis
3. **Maintenance Burden**: Changes require updating multiple schemas
4. **CaaS Integration**: Network scoring requires aggregating disparate tables
5. **Scalability**: Hard to add new relationship types

### After Profile Graph (v4.6)

**Unified Graph Structure**:
```
profile_graph table (ALL relationships)
├── source_profile_id → target_profile_id
├── relationship_type (ENUM: GUARDIAN | SOCIAL | BOOKING | AGENT_DELEGATION | AGENT_REFERRAL)
├── status (ENUM: PENDING | ACTIVE | BLOCKED | COMPLETED)
├── metadata (JSONB: flexible context data)
└── SOLUTION: One table, infinite relationship types
```

**Benefits**:
1. **Single Source of Truth**: All relationships in one place
2. **Simple Queries**: `SELECT * FROM profile_graph WHERE source_profile_id = $1`
3. **Easy Maintenance**: Add new relationship type = add enum value
4. **CaaS-Ready**: Direct integration via `get_network_stats()` RPC
5. **Future-Proof**: Metadata column supports new use cases

---

## Core Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Profile Graph System (v4.6)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Database Layer                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  profile_graph TABLE                                 │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐│  │  │
│  │  │  │ Columns:                                         ││  │  │
│  │  │  │ - id (UUID PK)                                   ││  │  │
│  │  │  │ - source_profile_id (UUID FK → profiles)        ││  │  │
│  │  │  │ - target_profile_id (UUID FK → profiles)        ││  │  │
│  │  │  │ - relationship_type (ENUM)                       ││  │  │
│  │  │  │ - status (ENUM)                                  ││  │  │
│  │  │  │ - metadata (JSONB)                               ││  │  │
│  │  │  │ - created_at, updated_at (TIMESTAMPTZ)          ││  │  │
│  │  │  └─────────────────────────────────────────────────┘│  │  │
│  │  │                                                       │  │  │
│  │  │  Constraints:                                        │  │  │
│  │  │  - no_self_links: source ≠ target                   │  │  │
│  │  │  - unique_relationship_path: (source, target, type) │  │  │
│  │  │                                                       │  │  │
│  │  │  Indexes (6 total):                                  │  │  │
│  │  │  - idx_profile_graph_source_id                      │  │  │
│  │  │  - idx_profile_graph_target_id                      │  │  │
│  │  │  - idx_profile_graph_type                           │  │  │
│  │  │  - idx_profile_graph_status                         │  │  │
│  │  │  - idx_profile_graph_composite                      │  │  │
│  │  │  - idx_profile_graph_bidirectional                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  relationship_type ENUM                              │  │  │
│  │  │  - GUARDIAN (Parent → Student)                       │  │  │
│  │  │  - SOCIAL (User ↔ User mutual)                      │  │  │
│  │  │  - BOOKING (Client → Tutor historical)              │  │  │
│  │  │  - AGENT_DELEGATION (Tutor → Agent commission)      │  │  │
│  │  │  - AGENT_REFERRAL (Agent → Client attribution)      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  relationship_status ENUM                            │  │  │
│  │  │  - PENDING (Awaiting acceptance)                     │  │  │
│  │  │  - ACTIVE (Currently valid)                          │  │  │
│  │  │  - BLOCKED (User blocked other)                      │  │  │
│  │  │  - COMPLETED (Past event)                            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Service Layer (TypeScript)                    │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  ProfileGraphService                                  │  │  │
│  │  │  (apps/web/src/lib/api/profile-graph.ts)            │  │  │
│  │  │                                                       │  │  │
│  │  │  Core CRUD Methods:                                   │  │  │
│  │  │  - createLink(params)        [INSERT]               │  │  │
│  │  │  - getUserLinks(id, type?)   [SELECT bidirectional] │  │  │
│  │  │  - getOutgoingLinks(id)      [SELECT source]        │  │  │
│  │  │  - getIncomingLinks(id)      [SELECT target]        │  │  │
│  │  │  - updateLink(id, status)    [UPDATE]               │  │  │
│  │  │  - deleteLink(id)             [DELETE]               │  │  │
│  │  │  - linkExists(s, t, type)    [SELECT check]         │  │  │
│  │  │                                                       │  │  │
│  │  │  Domain-Specific Helpers:                            │  │  │
│  │  │  - getGuardianLinks(parentId)                       │  │  │
│  │  │  - getSocialLinks(userId)                           │  │  │
│  │  │  - getBookingLinks(userId)                          │  │  │
│  │  │  - sendConnectionRequest(from, to)                  │  │  │
│  │  │  - acceptConnectionRequest(linkId)                  │  │  │
│  │  │  - blockUser(linkId)                                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Integration Points                        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Network Feature (v4.4)                              │  │  │
│  │  │  → Uses SOCIAL relationship type                     │  │  │
│  │  │  → PENDING status for connection requests            │  │  │
│  │  │  → BLOCKED status for blocked users                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Student Onboarding (v5.0)                           │  │  │
│  │  │  → Uses GUARDIAN relationship type                   │  │  │
│  │  │  → Metadata: student_email, invitation_sent_at       │  │  │
│  │  │  → Authorization: parent can book for student        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Reviews Feature (v4.5)                              │  │  │
│  │  │  → Uses BOOKING relationship type                    │  │  │
│  │  │  → COMPLETED status (immutable historical record)    │  │  │
│  │  │  → Only users with BOOKING link can leave reviews    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Referrals Feature (v4.3) + CaaS (v5.5)             │  │  │
│  │  │  → Uses AGENT_REFERRAL for attribution               │  │  │
│  │  │  → Uses AGENT_DELEGATION for commission              │  │  │
│  │  │  → CaaS reads for network scoring (Bucket 3)         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Design

### Table: profile_graph

**Purpose**: Unified storage for all user-to-user relationships

**Schema** (from `061_add_profile_graph_v4_6.sql:48-83`):
```sql
CREATE TABLE public.profile_graph (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The directed edge: source → target
  source_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- The type of relationship (what)
  relationship_type relationship_type NOT NULL,

  -- The state of relationship (when/if)
  status relationship_status NOT NULL DEFAULT 'ACTIVE',

  -- Flexible context data (how/why)
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business logic constraints
  CONSTRAINT no_self_links CHECK (source_profile_id <> target_profile_id),
  CONSTRAINT unique_relationship_path UNIQUE (source_profile_id, target_profile_id, relationship_type)
);
```

**Key Design Decisions**:

1. **Directed Graph Structure**: `source → target` allows modeling both symmetric (SOCIAL) and asymmetric (GUARDIAN) relationships
2. **ENUM Types**: Strong typing for relationship_type and status prevents invalid data
3. **JSONB Metadata**: Flexible storage for domain-specific context without schema changes
4. **Unique Constraint**: Prevents duplicate relationships between same two users of same type
5. **Cascade Deletes**: When user is deleted, all their relationships are automatically removed

### ENUM Types

**relationship_type** (from `061_add_profile_graph_v4_6.sql:21-27`):
```sql
CREATE TYPE relationship_type AS ENUM (
  'GUARDIAN',         -- Parent → Student (authority)
  'SOCIAL',          -- User ↔ User (mutual connection)
  'BOOKING',         -- Client → Tutor (completed booking)
  'AGENT_DELEGATION', -- Tutor → Agent (commission)
  'AGENT_REFERRAL'   -- Agent → Client (referral)
);
```

**relationship_status** (from `061_add_profile_graph_v4_6.sql:33-38`):
```sql
CREATE TYPE relationship_status AS ENUM (
  'PENDING',   -- Awaiting acceptance (e.g., connection request)
  'ACTIVE',    -- Currently valid relationship
  'BLOCKED',   -- One user blocked the other
  'COMPLETED'  -- Past event (e.g., booking finished)
);
```

### Performance Indexes

**6 Strategic Indexes** (from `061_add_profile_graph_v4_6.sql:99-122`):

```sql
-- 1. Source profile lookups (e.g., "my outgoing links")
CREATE INDEX idx_profile_graph_source_id ON profile_graph(source_profile_id);

-- 2. Target profile lookups (e.g., "who linked to me?")
CREATE INDEX idx_profile_graph_target_id ON profile_graph(target_profile_id);

-- 3. Filter by relationship type (e.g., "all GUARDIAN links")
CREATE INDEX idx_profile_graph_type ON profile_graph(relationship_type);

-- 4. Filter by status (e.g., "all PENDING requests")
CREATE INDEX idx_profile_graph_status ON profile_graph(status);

-- 5. Composite index for most common query pattern
CREATE INDEX idx_profile_graph_composite
  ON profile_graph(source_profile_id, relationship_type, status);

-- 6. Bidirectional lookups (e.g., "all my connections regardless of direction")
CREATE INDEX idx_profile_graph_bidirectional
  ON profile_graph(source_profile_id, target_profile_id);
```

**Query Performance Benchmarks**:
- Source lookup: <5ms (single index scan)
- Target lookup: <5ms (single index scan)
- Type + status filter: <10ms (composite index)
- Bidirectional query: <10ms (index + OR condition)

---

## Service Layer Implementation

### ProfileGraphService Architecture

**Location**: `apps/web/src/lib/api/profile-graph.ts`
**Pattern**: Service Layer with domain-specific helpers
**Lines of Code**: 411 lines

**Core Methods** (profile-graph.ts:85-269):

```typescript
class ProfileGraphService {
  // CREATE: Insert new relationship
  static async createLink(params: CreateLinkParams): Promise<ProfileGraphLink | null>

  // READ: Query relationships
  static async getUserLinks(profileId: string, type?: RelationshipType, status?: RelationshipStatus): Promise<ProfileGraphLink[]>
  static async getOutgoingLinks(profileId: string, type?: RelationshipType, status?: RelationshipStatus): Promise<ProfileGraphLink[]>
  static async getIncomingLinks(profileId: string, type?: RelationshipType, status?: RelationshipStatus): Promise<ProfileGraphLink[]>

  // UPDATE: Modify relationship status/metadata
  static async updateLink(params: UpdateLinkParams): Promise<ProfileGraphLink | null>

  // DELETE: Remove relationship
  static async deleteLink(linkId: string): Promise<boolean>

  // CHECK: Verify relationship exists
  static async linkExists(sourceId: string, targetId: string, type: RelationshipType, status?: RelationshipStatus): Promise<boolean>
}
```

**Domain-Specific Helpers** (profile-graph.ts:316-410):

```typescript
// Guardian Links (Student Onboarding v5.0)
static async getGuardianLinks(parentId: string): Promise<ProfileGraphLink[]>

// Social Links (Network v4.4)
static async getSocialLinks(profileId: string, status: RelationshipStatus = 'ACTIVE'): Promise<ProfileGraphLink[]>
static async getPendingSocialRequests(profileId: string): Promise<ProfileGraphLink[]>
static async sendConnectionRequest(requesterId: string, receiverId: string): Promise<ProfileGraphLink | null>
static async acceptConnectionRequest(linkId: string): Promise<ProfileGraphLink | null>

// Booking History (Reviews v4.5)
static async getBookingLinks(profileId: string): Promise<ProfileGraphLink[]>

// User Management
static async blockUser(linkId: string): Promise<ProfileGraphLink | null>
```

### Example Implementation: createLink()

**Code Reference** (profile-graph.ts:85-106):
```typescript
static async createLink(params: CreateLinkParams): Promise<ProfileGraphLink | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profile_graph')
    .insert({
      source_profile_id: params.sourceId,
      target_profile_id: params.targetId,
      relationship_type: params.type,
      status: params.status || 'ACTIVE',
      metadata: params.metadata || null
    })
    .select()
    .single();

  if (error) {
    console.error('[ProfileGraphService] Error creating link:', error);
    throw new Error(`Failed to create ${params.type} link: ${error.message}`);
  }

  return data;
}
```

**Usage Example**:
```typescript
// Create guardian link (Student Onboarding v5.0)
await ProfileGraphService.createLink({
  sourceId: parentId,
  targetId: studentId,
  type: 'GUARDIAN',
  status: 'ACTIVE',
  metadata: {
    student_email: 'student@example.com',
    invitation_sent_at: new Date().toISOString()
  }
});
```

---

## Security Architecture

### Row-Level Security (RLS) Policies

**4 Policies** (from `061_add_profile_graph_v4_6.sql:131-157`):

```sql
-- Policy 1: Users can view relationships they're part of
CREATE POLICY "Users can view their relationships"
  ON profile_graph FOR SELECT
  USING (
    auth.uid() = source_profile_id
    OR
    auth.uid() = target_profile_id
  );

-- Policy 2: Users can create relationships where they are the source
CREATE POLICY "Users can create relationships"
  ON profile_graph FOR INSERT
  WITH CHECK (auth.uid() = source_profile_id);

-- Policy 3: Users can update relationships they're part of
-- Note: Both source and target can update (e.g., target can accept/reject)
CREATE POLICY "Users can update their relationships"
  ON profile_graph FOR UPDATE
  USING (
    auth.uid() = source_profile_id
    OR
    auth.uid() = target_profile_id
  );

-- Policy 4: Only the source can delete relationships
CREATE POLICY "Users can delete relationships they created"
  ON profile_graph FOR DELETE
  USING (auth.uid() = source_profile_id);
```

**Security Implications**:
1. **Read Access**: Users can only see relationships they're involved in
2. **Write Access**: Users can only create links where they're the source
3. **Update Access**: Both parties can update (enables target to accept/reject)
4. **Delete Access**: Only the initiator (source) can delete the relationship

---

## Integration with Other Features

### 1. Network Feature (v4.4) - Social Links

**Relationship Type**: `SOCIAL`
**Directionality**: Bidirectional (treated as mutual despite directed storage)

**Flow**:
```typescript
// 1. User A sends connection request
await ProfileGraphService.sendConnectionRequest(userAId, userBId);
// Creates: { source: A, target: B, type: 'SOCIAL', status: 'PENDING' }

// 2. User B views pending requests
const requests = await ProfileGraphService.getIncomingLinks(userBId, 'SOCIAL', 'PENDING');

// 3. User B accepts
await ProfileGraphService.updateLink({ linkId: requestId, status: 'ACTIVE' });

// 4. Query all connections (bidirectional)
const connections = await ProfileGraphService.getSocialLinks(userAId);
// Returns links where userAId is EITHER source OR target
```

**SQL Query for Bidirectional Lookup**:
```sql
SELECT * FROM profile_graph
WHERE (source_profile_id = $1 OR target_profile_id = $1)
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE';
```

### 2. Student Onboarding (v5.0) - Guardian Links

**Relationship Type**: `GUARDIAN`
**Directionality**: Unidirectional (Parent → Student)

**Flow**:
```typescript
// 1. Parent creates guardian link
await ProfileGraphService.createLink({
  sourceId: parentId,
  targetId: studentId,
  type: 'GUARDIAN',
  status: 'ACTIVE',
  metadata: {
    student_email: 'student@example.com',
    invitation_sent_at: new Date().toISOString()
  }
});

// 2. Authorization check before booking
const canBook = await ProfileGraphService.linkExists(
  parentId,
  studentId,
  'GUARDIAN',
  'ACTIVE'
);

if (canBook) {
  // Allow parent to book on behalf of student
}
```

### 3. Reviews Feature (v4.5) - Booking Links

**Relationship Type**: `BOOKING`
**Directionality**: Unidirectional (Client → Tutor)
**Status**: Always `COMPLETED` (immutable historical record)

**Flow**:
```typescript
// 1. After booking completion, create BOOKING link
await ProfileGraphService.createLink({
  sourceId: clientId,
  targetId: tutorId,
  type: 'BOOKING',
  status: 'COMPLETED',
  metadata: {
    booking_id: bookingId,
    student_id: studentId,
    review_session_id: reviewId
  }
});

// 2. Eligibility check before leaving review
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);

if (!hasBooked) {
  throw new Error('You must complete a booking before leaving a review');
}
```

### 4. Referrals Feature (v4.3) + CaaS (v5.5) - Agent Links

**Relationship Types**:
- `AGENT_REFERRAL`: Agent → Client (referral attribution)
- `AGENT_DELEGATION`: Tutor → Agent (commission sharing)

**Flow**:
```typescript
// 1. Agent refers client
await ProfileGraphService.createLink({
  sourceId: agentId,
  targetId: clientId,
  type: 'AGENT_REFERRAL',
  status: 'ACTIVE',
  metadata: {
    referral_code: 'AGENT123',
    referred_at: new Date().toISOString()
  }
});

// 2. CaaS reads AGENT_REFERRAL for network scoring
// get_network_stats() RPC function:
SELECT EXISTS (
  SELECT 1 FROM profile_graph
  WHERE target_profile_id = tutor_id
    AND relationship_type = 'AGENT_REFERRAL'
    AND status = 'ACTIVE'
) AS is_agent_referred;

// If TRUE: Tutor gets +8 network bonus (CaaS Bucket 3)
```

---

## Migration Strategy

### Migration 061: Create profile_graph Table

**File**: `apps/api/migrations/061_add_profile_graph_v4_6.sql`
**Purpose**: Create new profile_graph table with ENUMs

**Steps**:
1. Create `relationship_type` enum (5 values)
2. Create `relationship_status` enum (4 values)
3. Create `profile_graph` table with constraints
4. Create 6 performance indexes
5. Enable RLS and create 4 policies
6. Add trigger for `updated_at` auto-update

### Migration 062: Migrate Existing Connections

**File**: `apps/api/migrations/062_migrate_connections_to_profile_graph.sql`
**Purpose**: Migrate data from old `connections` table

**Steps**:
1. Copy existing connections to profile_graph as `SOCIAL` type
2. Map old status values to new enum values
3. Verify data integrity
4. (Optional) Drop old `connections` table

**Rollback**:
- Rollback scripts available: `061_add_profile_graph_v4_6_rollback.sql`
- Restores old schema if needed

---

## Performance Considerations

### Query Optimization

**Index Strategy**:
1. **Source lookups**: Use `idx_profile_graph_source_id` (<5ms)
2. **Target lookups**: Use `idx_profile_graph_target_id` (<5ms)
3. **Type + Status filters**: Use `idx_profile_graph_composite` (<10ms)
4. **Bidirectional queries**: Use `idx_profile_graph_bidirectional` with OR clause (<10ms)

**Query Patterns**:
```sql
-- GOOD: Uses composite index
SELECT * FROM profile_graph
WHERE source_profile_id = $1
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE';

-- GOOD: Uses source index
SELECT * FROM profile_graph
WHERE source_profile_id = $1;

-- ACCEPTABLE: Uses bidirectional index + OR (10ms)
SELECT * FROM profile_graph
WHERE (source_profile_id = $1 OR target_profile_id = $1)
  AND relationship_type = 'SOCIAL';
```

### Scalability

**Current Scale**:
- Users: ~10,000
- Relationships per user: ~50 average
- Total rows: ~500,000
- Table size: ~50MB
- Query time: <10ms (indexed)

**Projected Scale** (10x growth):
- Users: ~100,000
- Relationships per user: ~50 average
- Total rows: ~5,000,000
- Table size: ~500MB
- Query time: <20ms (still acceptable with indexes)

**Scaling Strategy**:
- Indexes keep queries fast up to 10M rows
- Beyond 10M: Consider partitioning by relationship_type
- JSONB metadata: Add GIN index if complex queries needed

---

## Future Enhancements

### Proposed: Connection Strength Scoring

**Goal**: Weight connections by interaction frequency

**Implementation**:
```typescript
// Add to metadata for SOCIAL links
{
  "interaction_count": 42,
  "last_interaction_at": "2025-12-12T10:00:00Z",
  "strength_score": 0.87 // 0-1 scale based on recency + frequency
}

// Update strength after each interaction
await ProfileGraphService.updateLink({
  linkId: linkId,
  metadata: {
    ...existingMetadata,
    interaction_count: existingMetadata.interaction_count + 1,
    last_interaction_at: new Date().toISOString(),
    strength_score: calculateStrength(...)
  }
});
```

**Use Cases**:
- CaaS network scoring weighted by strength
- Marketplace recommendations based on strong connections
- Network graph visualization (edge width = strength)

### Proposed: Multi-Hop Path Finding

**Goal**: Find connection paths between users (e.g., "You → Friend → Tutor")

**Implementation**:
```sql
-- Recursive CTE for path finding
WITH RECURSIVE connection_path AS (
  -- Base case: direct connections
  SELECT
    source_profile_id,
    target_profile_id,
    ARRAY[source_profile_id, target_profile_id] as path,
    1 as depth
  FROM profile_graph
  WHERE source_profile_id = $start_user_id
    AND relationship_type = 'SOCIAL'
    AND status = 'ACTIVE'

  UNION

  -- Recursive case: follow connections
  SELECT
    cp.source_profile_id,
    pg.target_profile_id,
    cp.path || pg.target_profile_id,
    cp.depth + 1
  FROM connection_path cp
  JOIN profile_graph pg ON cp.target_profile_id = pg.source_profile_id
  WHERE pg.relationship_type = 'SOCIAL'
    AND pg.status = 'ACTIVE'
    AND cp.depth < 3  -- Limit to 3 degrees of separation
    AND NOT (pg.target_profile_id = ANY(cp.path))  -- Prevent cycles
)
SELECT * FROM connection_path
WHERE target_profile_id = $end_user_id
ORDER BY depth
LIMIT 1;
```

**Use Cases**:
- "How are you connected to this tutor?"
- Referral chains visualization
- Trust paths for cold introductions

---

**Last Updated**: 2025-12-12
**Version**: v4.6 (Unified Relationship Management)
**Maintainer**: Platform Team
