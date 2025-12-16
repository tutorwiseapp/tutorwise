# Profile Graph - AI Assistant Prompt v2

**Feature**: Profile Graph
**Version**: v4.6 (Unified Relationship Management)
**Last Updated**: 2025-12-13
**Documentation Style**: Simplified AI Context (v2)
**Target Audience**: AI Assistants (Claude Code, GitHub Copilot, etc.)

---

## Quick Reference

### What is Profile Graph?

Profile Graph is TutorWise's **unified relationship management system** that consolidates all user-to-user relationships into a single directed graph structure.

**One Sentence Summary**: Think of it as a "social network database" that powers not just friendships, but also parent-student relationships, booking history, and agent referrals.

---

### Five Relationship Types

| Type | Direction | Example | Status | Primary Use Case |
|------|-----------|---------|--------|------------------|
| **GUARDIAN** | Uni (Parent → Student) | Mom → Emma (age 12) | ACTIVE | Student Onboarding v5.0 |
| **SOCIAL** | Bi (User ↔ User) | Alice ↔ Bob (friends) | PENDING → ACTIVE | Network v4.4 + CaaS v5.5 |
| **BOOKING** | Uni (Client → Tutor) | John → Alice (past session) | COMPLETED | Reviews v4.5 |
| **AGENT_DELEGATION** | Uni (Tutor → Agent) | Alice → Agency (10% commission) | ACTIVE | Payment Distribution |
| **AGENT_REFERRAL** | Uni (Agent → Client) | Agency → John (referral code) | ACTIVE | CaaS v5.5 + Referrals v4.3 |

**Directionality Key**:
- **Uni** (Unidirectional): Source has authority/attribution, query `WHERE source = user`
- **Bi** (Bidirectional): Mutual relationship, query `WHERE source = user OR target = user`

---

### Core Service Methods

**File**: `apps/web/src/lib/api/profile-graph.ts`

| Method | Purpose | Returns |
|--------|---------|---------|
| `createLink(params)` | Create new relationship | `ProfileGraphLink \| null` |
| `getUserLinks(id, type?, status?)` | Get all relationships (bidirectional) | `ProfileGraphLink[]` |
| `getOutgoingLinks(id, type?, status?)` | Get relationships where user is source | `ProfileGraphLink[]` |
| `getIncomingLinks(id, type?, status?)` | Get relationships where user is target | `ProfileGraphLink[]` |
| `linkExists(source, target, type, status?)` | Check if relationship exists | `boolean` |
| `updateLink(id, status)` | Change relationship status | `ProfileGraphLink \| null` |
| `deleteLink(id)` | Remove relationship | `boolean` |

**Domain-Specific Helpers** (wrap core methods):
- `sendConnectionRequest(from, to)` - Create SOCIAL link with PENDING status
- `acceptConnectionRequest(linkId)` - Update SOCIAL link to ACTIVE
- `getGuardianLinks(parentId)` - Get all GUARDIAN links (parent → students)
- `getSocialLinks(userId)` - Get all SOCIAL links (bidirectional)

---

## System Architecture

### Database Table: profile_graph

**Core Fields**:
- `id` (UUID): Unique link identifier
- `source_profile_id` (UUID → profiles.id): Relationship initiator
- `target_profile_id` (UUID → profiles.id): Relationship receiver
- `relationship_type` (ENUM): One of 5 types above
- `status` (ENUM): PENDING | ACTIVE | BLOCKED | COMPLETED
- `metadata` (JSONB): Flexible context data
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Constraints**:
1. **no_self_links**: CHECK (source ≠ target) → Prevents self-relationships
2. **unique_relationship_path**: UNIQUE (source, target, type) → Prevents duplicates

**Indexes** (6 total):
- `idx_profile_graph_source_id` → Fast source lookups (<5ms)
- `idx_profile_graph_target_id` → Fast target lookups (<5ms)
- `idx_profile_graph_composite` → Fast (source + type + status) queries (<5ms)
- `idx_profile_graph_bidirectional` → Bidirectional queries (<10ms)
- Plus 2 more for type/status filtering

---

### Row-Level Security (RLS)

**4 Policies** (enforced at database level):

1. **SELECT**: You can read links where you're source OR target
2. **INSERT**: You can create links where you're source
3. **UPDATE**: You can update links where you're source OR target
4. **DELETE**: You can delete links where you're source (only)

**Why This Matters**:
- Users cannot see other users' relationships (privacy)
- Users cannot create relationships on behalf of others (security)
- Both parties can update status (e.g., target can accept/reject request)

---

## Common Usage Patterns

### Pattern 1: Create Social Connection

**Scenario**: User A sends connection request to User B

```typescript
// Step 1: Send request
await ProfileGraphService.sendConnectionRequest(userA_id, userB_id);
// Creates: { source: A, target: B, type: SOCIAL, status: PENDING }

// Step 2: User B views pending requests
const requests = await ProfileGraphService.getPendingSocialRequests(userB_id);

// Step 3: User B accepts
await ProfileGraphService.acceptConnectionRequest(requestId);
// Updates: { status: ACTIVE }
```

**Key Points**:
- Initial status = PENDING (awaits acceptance)
- Both users see connection after ACTIVE
- Either party can block (status = BLOCKED)

---

### Pattern 2: Create Guardian Link

**Scenario**: Parent adds student to manage their profile

```typescript
await ProfileGraphService.createLink({
  sourceId: parentId,
  targetId: studentId,
  type: 'GUARDIAN',
  status: 'ACTIVE',  // No approval needed
  metadata: {
    student_email: 'student@example.com',
    invitation_sent_at: new Date().toISOString()
  }
});

// Later: Check authorization
const canBook = await ProfileGraphService.linkExists(
  parentId,
  studentId,
  'GUARDIAN',
  'ACTIVE'
);

if (canBook) {
  // Allow parent to book sessions for student
}
```

**Key Points**:
- Unidirectional (parent → student, not reverse)
- Status always ACTIVE (no approval flow)
- Used for authorization checks

---

### Pattern 3: Create Booking Link (After Session Completion)

**Scenario**: Track booking history for review eligibility

```typescript
// After booking completes
await ProfileGraphService.createLink({
  sourceId: clientId,
  targetId: tutorId,
  type: 'BOOKING',
  status: 'COMPLETED',  // Always COMPLETED (historical record)
  metadata: {
    booking_id: bookingId,
    session_date: '2025-12-13'
  }
});

// Later: Check if client can leave review
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);

if (!hasBooked) {
  throw new Error('You must complete a booking before leaving a review');
}
```

**Key Points**:
- Status always COMPLETED (immutable historical fact)
- Never update or delete (data retention for reviews)
- Used for eligibility checks

---

### Pattern 4: Query Bidirectional Relationships (SOCIAL)

**Scenario**: Display "My Network" page

```typescript
// Get all connections (regardless of who initiated)
const connections = await ProfileGraphService.getSocialLinks(userId);
// Returns links where userId is EITHER source OR target

// Alternative: Use core method
const links = await ProfileGraphService.getUserLinks(userId, 'SOCIAL', 'ACTIVE');
```

**Key Points**:
- SOCIAL connections are mutual (bidirectional)
- Query must check both source AND target
- Use `getSocialLinks()` helper (handles bidirectional logic)

---

### Pattern 5: Query Unidirectional Relationships (GUARDIAN)

**Scenario**: Display "My Students" page

```typescript
// Get students managed by parent (outgoing only)
const students = await ProfileGraphService.getGuardianLinks(parentId);
// Returns links where parentId is source

// Alternative: Use core method
const links = await ProfileGraphService.getOutgoingLinks(parentId, 'GUARDIAN', 'ACTIVE');
```

**Key Points**:
- GUARDIAN links are unidirectional (parent → student)
- Query only outgoing (WHERE source = parent)
- Use `getGuardianLinks()` helper (handles directionality)

---

## Integration Points

### Integration 1: CaaS (v5.5) - Network Scoring

**CaaS Bucket 3: Network & Referrals (20 points max)**

Profile Graph powers 2 components:

**Component 1: Social Connection Count (+8 points if >10 connections)**

Query implementation (via RPC function):
```
Count SOCIAL links WHERE (source = user OR target = user) AND status = ACTIVE
```

**Component 2: Agent Referral Bonus (+8 points if agent-referred)**

Query implementation (via RPC function):
```
Check if EXISTS: AGENT_REFERRAL link WHERE target = tutor AND status = ACTIVE
```

**File Reference**: `supabase/migrations/073_create_caas_rpc_functions.sql:get_network_stats()`

---

### Integration 2: Student Onboarding (v5.0) - Authorization

**Use Case**: Parent books session on behalf of student

```typescript
// Check if parent has GUARDIAN link to student
const canBook = await ProfileGraphService.linkExists(
  parentId,
  studentId,
  'GUARDIAN',
  'ACTIVE'
);

if (!canBook) {
  throw new Error('You do not have permission to book for this student');
}

// Proceed with booking...
```

**File Reference**: `apps/web/src/lib/services/student-onboarding.ts`

---

### Integration 3: Reviews Feature (v4.5) - Eligibility

**Use Case**: Only allow reviews from clients who've booked tutor

```typescript
// Check if BOOKING link exists
const hasBooked = await ProfileGraphService.linkExists(
  clientId,
  tutorId,
  'BOOKING'
);

if (!hasBooked) {
  return res.status(403).json({
    error: 'You must complete a booking before leaving a review'
  });
}

// Create review...
```

**File Reference**: `apps/web/src/lib/services/reviews.ts:canLeaveReview()`

---

### Integration 4: Network Feature (v4.4) - Social Connections

**Use Case**: Display connections list and connection requests

```typescript
// Get active connections (bidirectional)
const connections = await ProfileGraphService.getSocialLinks(userId, 'ACTIVE');

// Get pending requests (where user is target)
const requests = await ProfileGraphService.getPendingSocialRequests(userId);

// Send connection request
await ProfileGraphService.sendConnectionRequest(userId, friendId);

// Accept request
await ProfileGraphService.acceptConnectionRequest(requestId);
```

**File Reference**: `apps/web/src/components/Network/ConnectionsList.tsx`

---

## Metadata Schemas by Type

### GUARDIAN Metadata
```typescript
{
  student_email?: string;
  invitation_sent_at: string;  // ISO 8601 timestamp
  permission_level?: 'FULL' | 'VIEW_ONLY';
}
```

---

### SOCIAL Metadata
```typescript
{
  message?: string;  // Connection request message
  mutual?: boolean;  // Whether reciprocal link exists
  connected_at?: string;  // ISO 8601 timestamp
}
```

---

### BOOKING Metadata
```typescript
{
  booking_id: string;  // UUID from bookings table
  student_id?: string;  // If parent booked for student
  review_session_id?: string;  // UUID from reviews table
  completed_at?: string;  // ISO 8601 timestamp
}
```

---

### AGENT_REFERRAL Metadata
```typescript
{
  referral_code: string;  // e.g., "AGENCY123"
  referred_at: string;  // ISO 8601 timestamp
}
```

---

### AGENT_DELEGATION Metadata
```typescript
{
  commission_percentage: number;  // e.g., 10 for 10%
  start_date?: string;  // ISO 8601 timestamp
}
```

---

## DO's and DON'Ts

### ✅ DO

**1. Use domain helpers for common operations**
```typescript
// GOOD: Use helper
await ProfileGraphService.getSocialLinks(userId);

// BAD: Manually write bidirectional query
await supabase.from('profile_graph')
  .select('*')
  .or(`source_profile_id.eq.${userId},target_profile_id.eq.${userId}`)
  .eq('relationship_type', 'SOCIAL');
```

**Rationale**: Helpers encapsulate bidirectional logic and type safety.

---

**2. Check relationship existence before creating**
```typescript
// GOOD: Check first
const exists = await ProfileGraphService.linkExists(userA, userB, 'SOCIAL');
if (!exists) {
  await ProfileGraphService.createLink({ ... });
}

// BAD: Create directly (may violate unique constraint)
await ProfileGraphService.createLink({ ... });
```

**Rationale**: Avoids database errors from unique constraint violations.

---

**3. Use correct directionality for each type**
```typescript
// GOOD: GUARDIAN is unidirectional (parent → student)
const students = await ProfileGraphService.getOutgoingLinks(parentId, 'GUARDIAN');

// BAD: Using bidirectional query for GUARDIAN
const students = await ProfileGraphService.getUserLinks(parentId, 'GUARDIAN');
// ^ This would include incoming GUARDIAN links (students who manage the parent?!)
```

**Rationale**: Each relationship type has semantic directionality.

---

**4. Trigger CaaS recalculation when relationships change**
```typescript
// GOOD: Update CaaS after connection accepted
await ProfileGraphService.acceptConnectionRequest(linkId);
await CaaSService.enqueueRecalculation(userId, 'NETWORK_CHANGE');

// BAD: Forget to update CaaS
await ProfileGraphService.acceptConnectionRequest(linkId);
// User's network score won't update!
```

**Rationale**: CaaS score depends on relationship counts.

---

**5. Use appropriate status for relationship type**
```typescript
// GOOD: BOOKING always COMPLETED
await ProfileGraphService.createLink({
  type: 'BOOKING',
  status: 'COMPLETED'
});

// GOOD: SOCIAL starts PENDING
await ProfileGraphService.createLink({
  type: 'SOCIAL',
  status: 'PENDING'
});

// BAD: BOOKING with ACTIVE status
await ProfileGraphService.createLink({
  type: 'BOOKING',
  status: 'ACTIVE'  // Wrong! Bookings are historical (COMPLETED)
});
```

**Rationale**: Each type has expected status lifecycle.

---

### ❌ DON'T

**1. Don't query metadata without index**
```typescript
// BAD: Slow (full table scan)
await supabase.from('profile_graph')
  .select('*')
  .eq('metadata->>referral_code', 'AGENT123');

// GOOD: Query by indexed fields + filter metadata in code
const links = await ProfileGraphService.getOutgoingLinks(agentId, 'AGENT_REFERRAL');
const filtered = links.filter(l => l.metadata?.referral_code === 'AGENT123');
```

**Rationale**: JSONB queries without GIN index are slow (>500ms).

---

**2. Don't create relationships on behalf of others**
```typescript
// BAD: Creating link where current user is not source
await ProfileGraphService.createLink({
  sourceId: otherUserId,  // Current user ≠ otherUserId
  targetId: targetId,
  type: 'SOCIAL'
});

// GOOD: Current user is always source
await ProfileGraphService.createLink({
  sourceId: currentUserId,  // auth.uid() = currentUserId
  targetId: targetId,
  type: 'SOCIAL'
});
```

**Rationale**: RLS INSERT policy blocks if source ≠ auth.uid().

---

**3. Don't create self-links**
```typescript
// BAD: User linking to themselves
await ProfileGraphService.createLink({
  sourceId: userId,
  targetId: userId,  // Same user!
  type: 'SOCIAL'
});

// GOOD: Validate source ≠ target first
if (sourceId !== targetId) {
  await ProfileGraphService.createLink({ ... });
}
```

**Rationale**: no_self_links constraint will throw error.

---

**4. Don't update immutable relationships**
```typescript
// BAD: Updating BOOKING status (should be immutable)
await ProfileGraphService.updateLink({
  linkId: bookingLinkId,
  status: 'ACTIVE'  // BOOKING should always be COMPLETED
});

// GOOD: BOOKING links are never updated
// (Create once, read many, never update)
```

**Rationale**: BOOKING links are historical facts, not mutable relationships.

---

**5. Don't forget cascade delete implications**
```typescript
// BAD: Deleting user without considering relationship cleanup
await supabase.from('profiles').delete().eq('id', userId);
// This CASCADE deletes ALL relationships (source AND target)

// GOOD: Warn user about data loss
const linkCount = await ProfileGraphService.getUserLinks(userId).length;
if (linkCount > 0) {
  confirm(`This will delete ${linkCount} relationships. Continue?`);
}
await supabase.from('profiles').delete().eq('id', userId);
```

**Rationale**: CASCADE DELETE is permanent, users should be warned.

---

## Performance Best Practices

### Query Optimization

**Use indexed columns in WHERE clause**:
```typescript
// GOOD: Uses composite index
await supabase.from('profile_graph')
  .select('*')
  .eq('source_profile_id', userId)
  .eq('relationship_type', 'SOCIAL')
  .eq('status', 'ACTIVE');
// Performance: <5ms (covering index)

// ACCEPTABLE: Uses bidirectional index
await supabase.from('profile_graph')
  .select('*')
  .or(`source_profile_id.eq.${userId},target_profile_id.eq.${userId}`)
  .eq('relationship_type', 'SOCIAL');
// Performance: <10ms (index + OR)

// BAD: No index (full table scan)
await supabase.from('profile_graph')
  .select('*')
  .eq('metadata->>booking_id', bookingId);
// Performance: >500ms (no index on JSONB)
```

---

### Scalability Considerations

**Current scale** (10k users):
- ~500k relationships
- Query time: <10ms
- Table size: ~50MB

**Projected scale** (100k users):
- ~5M relationships
- Query time: <20ms (indexes still effective)
- Table size: ~500MB

**Scaling strategy**:
- Indexes effective up to 10M rows
- Beyond 10M: Partition by relationship_type
- Monitor slow query logs for >100ms queries

---

## File References

**Core Implementation**:
- Service Layer: `apps/web/src/lib/api/profile-graph.ts` (411 lines)
- Type Definitions: `apps/web/src/types/profile-graph.ts`

**Database**:
- Schema Migration: `apps/api/migrations/061_add_profile_graph_v4_6.sql`
- Data Migration: `apps/api/migrations/062_migrate_connections_to_profile_graph.sql`
- RPC Functions: `supabase/migrations/073_create_caas_rpc_functions.sql:get_network_stats()`

**Integration Points**:
- CaaS Scoring: `apps/web/src/lib/services/caas/strategies/tutor.ts`
- Student Onboarding: `apps/web/src/lib/services/student-onboarding.ts`
- Reviews: `apps/web/src/lib/services/reviews.ts:canLeaveReview()`
- Network UI: `apps/web/src/components/Network/ConnectionsList.tsx`

**Documentation**:
- Solution Design v2: [profile-graph-solution-design-v2.md](./profile-graph-solution-design-v2.md)
- Implementation Guide v2: [profile-graph-implementation-v2.md](./profile-graph-implementation-v2.md)
- v1 References (code snippets): [profile-graph-solution-design.md](./profile-graph-solution-design.md), [profile-graph-implementation.md](./profile-graph-implementation.md)

---

**Document Version**: v4.6 (Simplified AI Context, v2)
**Last Reviewed**: 2025-12-13
**Next Review**: 2026-01-15
**Feedback**: platform-team@tutorwise.com

---

## Comparison with v1 Documentation

This v2 document reduces code blocks and adds:
- ✅ Quick reference table for 5 relationship types
- ✅ Comprehensive DO/DON'T section with rationale
- ✅ Common usage patterns with examples
- ✅ Metadata schemas by type
- ✅ Performance best practices
- ✅ File references for deeper exploration

**Code blocks reduced**: ~12 → ~5 (60% reduction)
**Focus shift**: Implementation details → Conceptual patterns + file references

**For code implementation details**, see v1 prompt: [profile-graph-prompt.md](./profile-graph-prompt.md)
