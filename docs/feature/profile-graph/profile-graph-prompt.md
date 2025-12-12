# Profile Graph - AI Assistant Prompt

**Feature**: Profile Graph
**Version**: v4.6 (Unified Relationship Management)
**Last Updated**: 2025-12-12
**Target Audience**: AI Assistants working on profile-graph features

---

## Feature Overview

**Profile Graph** is TutorWise's unified relationship management system. It consolidates all user-to-user relationships (Social, Guardian, Booking, Agent) into a single `profile_graph` table using a directed graph structure with relationship_type enums.

**Core Purpose**:
- **Single Source of Truth**: One table for all relationships
- **Foundation Layer**: Powers Network, Student Onboarding, Reviews, Referrals features
- **Performance**: <5ms queries via 6 strategic indexes
- **Flexibility**: JSONB metadata for domain-specific context

**Architecture Style**: Directed Graph with Service Layer Pattern

---

## System Context

### Core Principles

1. **Unified Table**: `profile_graph` replaces multiple relationship tables
2. **Directed Edges**: `source → target` models both symmetric and asymmetric relationships
3. **Typed Relationships**: 5 enum types (GUARDIAN, SOCIAL, BOOKING, AGENT_DELEGATION, AGENT_REFERRAL)
4. **Lifecycle States**: 4 status values (PENDING, ACTIVE, BLOCKED, COMPLETED)
5. **Flexible Metadata**: JSONB for relationship-specific context

### Technology Stack

- **Backend**: TypeScript Service Layer (`ProfileGraphService`)
- **Database**: PostgreSQL with custom ENUMs
- **Security**: Row-Level Security (RLS) policies
- **Performance**: 6 indexes for common query patterns

---

## Relationship Types

```typescript
type RelationshipType =
  | 'GUARDIAN'         // Parent → Student (authority)
  | 'SOCIAL'           // User ↔ User (mutual connection)
  | 'BOOKING'          // Client → Tutor (historical record)
  | 'AGENT_DELEGATION' // Tutor → Agent (commission)
  | 'AGENT_REFERRAL';  // Agent → Client (attribution)
```

### Directionality Patterns

**Bidirectional (SOCIAL)**:
- Stored as: `{ source: A, target: B }`
- Queried as: `WHERE source = user OR target = user`
- Use case: Mutual connections

**Unidirectional (GUARDIAN, BOOKING, AGENT_*)**:
- Stored as: `{ source: parent, target: student }`
- Queried as: `WHERE source = parent` (outgoing only)
- Use case: Authority or attribution

---

## Database Schema

### Table: profile_graph

```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY,
  source_profile_id UUID REFERENCES profiles(id),
  target_profile_id UUID REFERENCES profiles(id),
  relationship_type relationship_type NOT NULL,
  status relationship_status NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  CONSTRAINT no_self_links CHECK (source_profile_id <> target_profile_id),
  CONSTRAINT unique_relationship_path UNIQUE (source_profile_id, target_profile_id, relationship_type)
);
```

**Metadata Examples**:
```json
// GUARDIAN
{ "student_email": "student@example.com", "invitation_sent_at": "2025-12-12T10:00:00Z" }

// BOOKING
{ "booking_id": "uuid", "student_id": "uuid", "review_session_id": "uuid" }

// AGENT_REFERRAL
{ "referral_code": "AGENT123", "referred_at": "2025-12-12T10:00:00Z" }
```

---

## Key Functions

### Function 1: ProfileGraphService.createLink()

**Location**: `apps/web/src/lib/api/profile-graph.ts:85-106`

**Purpose**: Create a new relationship between two users

**Code Reference**:
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
    throw new Error(`Failed to create ${params.type} link: ${error.message}`);
  }

  return data;
}
```

### Function 2: ProfileGraphService.getUserLinks()

**Location**: `apps/web/src/lib/api/profile-graph.ts:118-141`

**Purpose**: Query all relationships for a user (bidirectional)

**Code Reference**:
```typescript
static async getUserLinks(
  profileId: string,
  type?: RelationshipType,
  status?: RelationshipStatus
): Promise<ProfileGraphLink[]> {
  const supabase = createClient();

  let query = supabase
    .from('profile_graph')
    .select('*')
    .or(`source_profile_id.eq.${profileId},target_profile_id.eq.${profileId}`);

  if (type) query = query.eq('relationship_type', type);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch relationships: ${error.message}`);
  }

  return data || [];
}
```

### Function 3: Domain-Specific Helpers

**Social Links** (Network v4.4):
```typescript
static async sendConnectionRequest(requesterId: string, receiverId: string): Promise<ProfileGraphLink | null>
static async acceptConnectionRequest(linkId: string): Promise<ProfileGraphLink | null>
static async getPendingSocialRequests(profileId: string): Promise<ProfileGraphLink[]>
```

**Guardian Links** (Student Onboarding v5.0):
```typescript
static async getGuardianLinks(parentId: string): Promise<ProfileGraphLink[]>
```

**Booking Links** (Reviews v4.5):
```typescript
static async getBookingLinks(profileId: string): Promise<ProfileGraphLink[]>
static async linkExists(sourceId: string, targetId: string, type: RelationshipType): Promise<boolean>
```

---

## Integration Points

### 1. Network Feature (v4.4)
- Uses `SOCIAL` relationship type
- `PENDING` status for connection requests
- `BLOCKED` status for blocked users
- Bidirectional queries for mutual connections

### 2. Student Onboarding (v5.0)
- Uses `GUARDIAN` relationship type
- Metadata stores student email and invitation details
- Authorization: Parent can book on behalf of student if GUARDIAN link exists

### 3. Reviews Feature (v4.5)
- Uses `BOOKING` relationship type
- Status always `COMPLETED` (immutable historical record)
- Eligibility check: Only users with BOOKING link can leave reviews

### 4. Referrals + CaaS (v4.3 + v5.5)
- Uses `AGENT_REFERRAL` for attribution (Agent → Client)
- Uses `AGENT_DELEGATION` for commission (Tutor → Agent)
- CaaS reads AGENT_REFERRAL links for network scoring (Bucket 3)

---

## Common Tasks

### Task 1: Create Social Connection

```typescript
// Send connection request
await ProfileGraphService.sendConnectionRequest(userAId, userBId);

// View pending requests
const requests = await ProfileGraphService.getPendingSocialRequests(userBId);

// Accept request
await ProfileGraphService.acceptConnectionRequest(requestId);
```

### Task 2: Create Guardian Link

```typescript
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

### Task 3: Check Booking History

```typescript
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);

if (!hasBooked) {
  throw new Error('You must complete a booking before leaving a review');
}
```

### Task 4: Query Relationships

```typescript
// Get all SOCIAL connections (bidirectional)
const connections = await ProfileGraphService.getSocialLinks(userId);

// Get outgoing GUARDIAN links
const students = await ProfileGraphService.getOutgoingLinks(userId, 'GUARDIAN');

// Get incoming AGENT_REFERRAL links
const referrers = await ProfileGraphService.getIncomingLinks(userId, 'AGENT_REFERRAL');
```

---

## Testing Checklist

- [ ] Create SOCIAL link with PENDING status
- [ ] Accept SOCIAL link → status changes to ACTIVE
- [ ] Create GUARDIAN link (parent → student)
- [ ] Create BOOKING link with COMPLETED status
- [ ] Query bidirectional SOCIAL links
- [ ] Query outgoing GUARDIAN links
- [ ] Query incoming AGENT_REFERRAL links
- [ ] Block user → status changes to BLOCKED
- [ ] Delete link → row removed
- [ ] Verify RLS: Users only see their own links
- [ ] Verify no_self_links constraint
- [ ] Verify unique_relationship_path constraint

---

## Security Considerations

### RLS Policies

```sql
-- Users can view relationships they're part of
CREATE POLICY "Users can view their relationships"
  ON profile_graph FOR SELECT
  USING (auth.uid() = source_profile_id OR auth.uid() = target_profile_id);

-- Users can create relationships where they are the source
CREATE POLICY "Users can create relationships"
  ON profile_graph FOR INSERT
  WITH CHECK (auth.uid() = source_profile_id);

-- Both source and target can update
CREATE POLICY "Users can update their relationships"
  ON profile_graph FOR UPDATE
  USING (auth.uid() = source_profile_id OR auth.uid() = target_profile_id);

-- Only source can delete
CREATE POLICY "Users can delete relationships they created"
  ON profile_graph FOR DELETE
  USING (auth.uid() = source_profile_id);
```

---

## Performance Optimization

### Query Performance

- **Source lookup**: <5ms (`idx_profile_graph_source_id`)
- **Target lookup**: <5ms (`idx_profile_graph_target_id`)
- **Type + Status**: <10ms (`idx_profile_graph_composite`)
- **Bidirectional**: <10ms (`idx_profile_graph_bidirectional` + OR clause)

### Best Practices

**GOOD**: Use composite index
```sql
SELECT * FROM profile_graph
WHERE source_profile_id = $1
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE';
```

**GOOD**: Use specific index
```sql
SELECT * FROM profile_graph
WHERE source_profile_id = $1;
```

**ACCEPTABLE**: Bidirectional query
```sql
SELECT * FROM profile_graph
WHERE (source_profile_id = $1 OR target_profile_id = $1)
  AND relationship_type = 'SOCIAL';
```

---

## Important Notes for AI Assistants

### Bidirectional vs Unidirectional

**CRITICAL**: Understand the directionality of each relationship type:

- **SOCIAL**: Stored directionally but treated as mutual
  - Query: `WHERE source = user OR target = user`
  - Both parties can see the connection

- **GUARDIAN**: Strictly unidirectional (Parent → Student)
  - Query: `WHERE source = parent`
  - Only parent has authority

- **BOOKING**: Unidirectional historical record (Client → Tutor)
  - Status always `COMPLETED`
  - Immutable record for review eligibility

- **AGENT_REFERRAL**: Unidirectional attribution (Agent → Client)
  - Used by CaaS for network scoring
  - Incoming AGENT_REFERRAL = +8 network bonus

### Metadata Usage

**CRITICAL**: Each relationship type has specific metadata schemas:

- **GUARDIAN**: `student_email`, `invitation_sent_at`
- **BOOKING**: `booking_id`, `student_id`, `review_session_id`
- **SOCIAL**: `mutual`, `connected_at`
- **AGENT_REFERRAL**: `referral_code`, `referred_at`
- **AGENT_DELEGATION**: `commission_percentage`

Do NOT assume metadata structure - check the relationship type first.

### Constraints

**CRITICAL**: Two table constraints prevent invalid data:

1. **no_self_links**: Users cannot link to themselves
   - Will throw error if `source_profile_id = target_profile_id`

2. **unique_relationship_path**: Only one relationship of each type between two users
   - Will throw error on duplicate `(source, target, type)` combination

---

**Last Updated**: 2025-12-12
**Version**: v4.6 (Unified Relationship Management)
**Maintainer**: Platform Team
