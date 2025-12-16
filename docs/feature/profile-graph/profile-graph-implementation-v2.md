# Profile Graph - Implementation Guide v2

**Version**: v4.6 (Unified Relationship Management)
**Date**: 2025-12-13
**Documentation Style**: Pattern-Focused (v2)
**Target Audience**: Backend Engineers, Feature Developers

---

## Quick Start

### What You'll Learn
- Architecture patterns for graph-based relationships
- How to add a new relationship type
- Common integration patterns with other features
- Testing strategies for relationship logic
- Deployment checklist

### Prerequisites
- PostgreSQL 14+ with ENUM and JSONB support
- Supabase client library configured
- Understanding of directed graphs (nodes + edges)

---

## Architecture Patterns

### Pattern 1: Service Layer with Domain Helpers

**Structure**:
```
ProfileGraphService (Core CRUD)
├── createLink()          ← Generic method
├── getUserLinks()        ← Generic method
├── updateLink()          ← Generic method
├── deleteLink()          ← Generic method
│
└── Domain-Specific Helpers
    ├── getGuardianLinks()      ← Wraps getUserLinks() with type='GUARDIAN'
    ├── getSocialLinks()        ← Wraps getUserLinks() with bidirectional logic
    ├── sendConnectionRequest() ← Wraps createLink() with validation
    └── acceptConnectionRequest() ← Wraps updateLink() with status change
```

**Why This Pattern?**

**Problem**: Different features need different relationship semantics:
- Network team: "Get my friends" (bidirectional SOCIAL)
- Student Onboarding: "Get students I manage" (unidirectional GUARDIAN, source only)
- Reviews: "Check if I booked this tutor" (existence check)

**Solution**: Core service provides primitives, domain helpers provide feature-specific APIs.

---

### Pattern 2: Bidirectional vs Unidirectional Queries

#### Bidirectional Pattern (SOCIAL connections)

**Use When**: Relationship is mutual (User A connects with User B → both see each other)

**Query Strategy**:
```
Query all relationships WHERE (source = user OR target = user)
```

**Example Method**:
```typescript
// File reference: apps/web/src/lib/api/profile-graph.ts:getSocialLinks()

getSocialLinks(userId: string, status = 'ACTIVE') {
  // Query both directions
  return supabase
    .from('profile_graph')
    .select('*')
    .or(`source_profile_id.eq.${userId},target_profile_id.eq.${userId}`)
    .eq('relationship_type', 'SOCIAL')
    .eq('status', status);
}
```

**Real-World Scenario**:
```
Scenario: Display "My Network" page

Step 1: User Alice clicks "My Network"
Step 2: Call getSocialLinks(alice_id)
Step 3: Query returns:
   - Alice → Bob (SOCIAL, ACTIVE) [Alice initiated]
   - Charlie → Alice (SOCIAL, ACTIVE) [Charlie initiated]
Step 4: UI displays both Bob and Charlie as "Connections"
```

---

#### Unidirectional Pattern (GUARDIAN, BOOKING)

**Use When**: Relationship has clear directionality (Parent → Student, Client → Tutor)

**Query Strategy**:
```
Query outgoing: WHERE source = user
Query incoming: WHERE target = user
```

**Example Method**:
```typescript
// File reference: apps/web/src/lib/api/profile-graph.ts:getGuardianLinks()

getGuardianLinks(parentId: string) {
  // Only outgoing (parent is source)
  return supabase
    .from('profile_graph')
    .select('*')
    .eq('source_profile_id', parentId)
    .eq('relationship_type', 'GUARDIAN')
    .eq('status', 'ACTIVE');
}
```

**Real-World Scenario**:
```
Scenario: Parent views "My Students" page

Step 1: Parent (Sarah) clicks "My Students"
Step 2: Call getGuardianLinks(sarah_id)
Step 3: Query returns:
   - Sarah → Emma (GUARDIAN, ACTIVE)
   - Sarah → Liam (GUARDIAN, ACTIVE)
Step 4: UI displays Emma and Liam (NOT other people's students)
```

---

### Pattern 3: Status Lifecycle Management

**Common Lifecycle Flows**:

#### Flow 1: Connection Request (SOCIAL)
```
PENDING → ACTIVE → (Optional) BLOCKED → DELETE

Step-by-step:
1. Create: source → target, status=PENDING
2. Accept: Update status to ACTIVE
3. Block: Update status to BLOCKED (if needed)
4. Delete: Remove row (ends relationship)
```

**Implementation**:
```typescript
// Step 1: Send request
sendConnectionRequest(requesterId, receiverId) {
  return createLink({
    sourceId: requesterId,
    targetId: receiverId,
    type: 'SOCIAL',
    status: 'PENDING'
  });
}

// Step 2: Accept request
acceptConnectionRequest(linkId) {
  return updateLink({
    linkId,
    status: 'ACTIVE'
  });
}

// Step 3: Block user
blockUser(linkId) {
  return updateLink({
    linkId,
    status: 'BLOCKED'
  });
}
```

---

#### Flow 2: Immutable Record (BOOKING)
```
COMPLETED (created directly, never changes)

Step-by-step:
1. Create: source → target, status=COMPLETED
2. Never update status (historical fact)
3. Never delete (data retention for reviews)
```

**Implementation**:
```typescript
// After booking completion
createBookingLink(clientId, tutorId, bookingId) {
  return createLink({
    sourceId: clientId,
    targetId: tutorId,
    type: 'BOOKING',
    status: 'COMPLETED',  // Always COMPLETED
    metadata: {
      booking_id: bookingId,
      completed_at: new Date().toISOString()
    }
  });
}
```

---

#### Flow 3: Long-Lived Active Relationship (GUARDIAN, AGENT_DELEGATION)
```
ACTIVE (created directly) → DELETE (when relationship ends)

Step-by-step:
1. Create: source → target, status=ACTIVE
2. Remain ACTIVE for duration
3. Delete when relationship ends (e.g., student turns 18, tutor leaves agency)
```

**Implementation**:
```typescript
// Create guardian link
createGuardianLink(parentId, studentId, studentEmail) {
  return createLink({
    sourceId: parentId,
    targetId: studentId,
    type: 'GUARDIAN',
    status: 'ACTIVE',
    metadata: {
      student_email: studentEmail,
      created_at: new Date().toISOString()
    }
  });
}

// Later: Student becomes independent
deleteGuardianLink(linkId) {
  return deleteLink(linkId);  // Permanent deletion
}
```

---

## How to Add a New Relationship Type

**Scenario**: Add `MENTORSHIP` relationship (Senior Tutor → Junior Tutor)

### Step 1: Update Database Enum (5 minutes)

**File**: Create new migration `099_add_mentorship_relationship.sql`

**Add to enum**:
```sql
-- Add new type to relationship_type enum
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'MENTORSHIP';

-- Note: Cannot remove enum values without recreating the type
-- Plan ahead: Ensure you really need this type
```

**Decision Checklist Before Adding**:
- [ ] Can this be modeled with existing types? (e.g., is MENTORSHIP just SOCIAL with metadata?)
- [ ] Is this a long-term feature or experiment? (Experiments: use metadata, not new types)
- [ ] Do multiple features need this type? (If only one feature: consider feature-specific table)

---

### Step 2: Update TypeScript Types (5 minutes)

**File**: `apps/web/src/types/profile-graph.ts`

**Add to type definition**:
```typescript
export type RelationshipType =
  | 'GUARDIAN'
  | 'SOCIAL'
  | 'BOOKING'
  | 'AGENT_DELEGATION'
  | 'AGENT_REFERRAL'
  | 'MENTORSHIP';  // ← Add new type

export interface MentorshipMetadata {
  program_id?: string;
  start_date: string;
  specialization: string;  // e.g., "Math", "Science"
}
```

---

### Step 3: Add Domain Helper Method (15 minutes)

**File**: `apps/web/src/lib/api/profile-graph.ts`

**Add helper**:
```typescript
/**
 * Get all junior tutors mentored by this senior tutor
 * @param mentorId - UUID of mentor (senior tutor)
 * @returns List of MENTORSHIP links where mentor is source
 */
static async getMentees(mentorId: string): Promise<ProfileGraphLink[]> {
  return this.getOutgoingLinks(mentorId, 'MENTORSHIP', 'ACTIVE');
}

/**
 * Get all mentors for this junior tutor
 * @param menteeId - UUID of mentee (junior tutor)
 * @returns List of MENTORSHIP links where mentee is target
 */
static async getMentors(menteeId: string): Promise<ProfileGraphLink[]> {
  return this.getIncomingLinks(menteeId, 'MENTORSHIP', 'ACTIVE');
}

/**
 * Create mentorship relationship
 * @param mentorId - Senior tutor
 * @param menteeId - Junior tutor
 * @param metadata - Program details
 */
static async createMentorship(
  mentorId: string,
  menteeId: string,
  metadata: MentorshipMetadata
): Promise<ProfileGraphLink | null> {
  return this.createLink({
    sourceId: mentorId,
    targetId: menteeId,
    type: 'MENTORSHIP',
    status: 'ACTIVE',
    metadata
  });
}
```

---

### Step 4: Update Integration Points (30 minutes)

**Integrate with other features**:

#### Integration A: CaaS Scoring
```typescript
// File: apps/web/src/lib/services/caas/strategies/tutor.ts

// Add mentorship bonus to network bucket
const mentorCount = await ProfileGraphService.getOutgoingLinks(
  profileId,
  'MENTORSHIP',
  'ACTIVE'
).length;

if (mentorCount > 0) {
  networkScore += 5;  // Bonus for being a mentor
}
```

#### Integration B: Profile Display
```typescript
// File: apps/web/src/components/TutorProfile.tsx

// Display mentors on profile
const mentors = await ProfileGraphService.getMentors(tutorId);

return (
  <div>
    <h3>Mentored By:</h3>
    {mentors.map(link => (
      <MentorBadge mentorId={link.source_profile_id} />
    ))}
  </div>
);
```

---

### Step 5: Write Tests (30 minutes)

**Test Coverage**:

```typescript
// File: apps/web/src/lib/api/__tests__/profile-graph.test.ts

describe('Mentorship Relationships', () => {
  test('creates mentorship link', async () => {
    const link = await ProfileGraphService.createMentorship(
      seniorTutorId,
      juniorTutorId,
      { program_id: 'PROG-123', specialization: 'Math', start_date: '2025-12-13' }
    );

    expect(link.relationship_type).toBe('MENTORSHIP');
    expect(link.status).toBe('ACTIVE');
    expect(link.metadata.program_id).toBe('PROG-123');
  });

  test('getMentees returns correct links', async () => {
    const mentees = await ProfileGraphService.getMentees(seniorTutorId);

    expect(mentees).toHaveLength(2);
    expect(mentees[0].target_profile_id).toBe(juniorTutorId);
  });

  test('prevents duplicate mentorship', async () => {
    await ProfileGraphService.createMentorship(mentorId, menteeId, { ... });

    // Attempt duplicate
    await expect(
      ProfileGraphService.createMentorship(mentorId, menteeId, { ... })
    ).rejects.toThrow('unique constraint');
  });

  test('RLS: mentor cannot see other mentorships', async () => {
    const otherMentorships = await ProfileGraphService.getMentees(otherMentorId);

    // Should be empty (RLS blocks access)
    expect(otherMentorships).toHaveLength(0);
  });
});
```

---

### Step 6: Deploy and Monitor (1 hour)

**Deployment Checklist**:

- [ ] Run migration in staging environment
- [ ] Verify enum value added: `SELECT unnest(enum_range(NULL::relationship_type));`
- [ ] Test helper methods in staging
- [ ] Monitor query performance (check index usage)
- [ ] Deploy to production
- [ ] Create dashboard to track mentorship adoption

**Monitoring Queries**:
```sql
-- Count mentorships created per day
SELECT DATE(created_at), COUNT(*)
FROM profile_graph
WHERE relationship_type = 'MENTORSHIP'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Check for orphaned links (source/target deleted)
SELECT COUNT(*)
FROM profile_graph pg
LEFT JOIN profiles p1 ON pg.source_profile_id = p1.id
LEFT JOIN profiles p2 ON pg.target_profile_id = p2.id
WHERE pg.relationship_type = 'MENTORSHIP'
  AND (p1.id IS NULL OR p2.id IS NULL);
```

---

## Common Integration Patterns

### Integration Pattern 1: Authorization Checks

**Use Case**: Verify user has permission before allowing action

**Example**: Parent booking session for student

```typescript
// File: apps/web/src/lib/services/bookings/create-booking.ts

async function createBookingForStudent(
  parentId: string,
  studentId: string,
  tutorId: string
) {
  // Step 1: Check authorization
  const canBook = await ProfileGraphService.linkExists(
    parentId,
    studentId,
    'GUARDIAN',
    'ACTIVE'
  );

  if (!canBook) {
    throw new Error('You do not have permission to book for this student');
  }

  // Step 2: Proceed with booking
  return createBooking({
    client_id: studentId,  // Booking is for student
    tutor_id: tutorId,
    booked_by: parentId    // But booked by parent
  });
}
```

**Pattern Summary**:
1. Check for relationship existence
2. Verify relationship type and status
3. Throw error if unauthorized
4. Proceed with action if authorized

---

### Integration Pattern 2: Eligibility Checks

**Use Case**: Determine if user is allowed to perform action

**Example**: Only allow reviews from clients who've booked tutor

```typescript
// File: apps/web/src/lib/services/reviews/can-leave-review.ts

async function canLeaveReview(clientId: string, tutorId: string): Promise<boolean> {
  // Check if BOOKING link exists
  return ProfileGraphService.linkExists(
    clientId,
    tutorId,
    'BOOKING'
  );
}

// Usage in API route
app.post('/api/reviews', async (req, res) => {
  const { tutor_id } = req.body;
  const client_id = req.user.id;

  if (!(await canLeaveReview(client_id, tutor_id))) {
    return res.status(403).json({
      error: 'You must complete a booking before leaving a review'
    });
  }

  // Create review...
});
```

**Pattern Summary**:
1. Check for historical relationship (BOOKING)
2. Return boolean (eligible vs ineligible)
3. Frontend hides review button if ineligible
4. Backend enforces check in API route

---

### Integration Pattern 3: Data Aggregation (CaaS Scoring)

**Use Case**: Calculate metrics from relationship graph

**Example**: Count social connections for CaaS network score

```typescript
// File: supabase/migrations/073_create_caas_rpc_functions.sql

CREATE OR REPLACE FUNCTION get_network_stats(profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'social_connection_count', (
      SELECT COUNT(*)
      FROM profile_graph
      WHERE (source_profile_id = profile_id OR target_profile_id = profile_id)
        AND relationship_type = 'SOCIAL'
        AND status = 'ACTIVE'
    ),
    'is_agent_referred', (
      SELECT EXISTS (
        SELECT 1 FROM profile_graph
        WHERE target_profile_id = profile_id
          AND relationship_type = 'AGENT_REFERRAL'
          AND status = 'ACTIVE'
      )
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage in CaaS**:
```typescript
// File: apps/web/src/lib/services/caas/strategies/tutor.ts

const networkStats = await supabase.rpc('get_network_stats', { profile_id: tutorId });

const connectionCount = networkStats.data.social_connection_count;
const isAgentReferred = networkStats.data.is_agent_referred;

let networkScore = 0;
if (connectionCount > 10) networkScore += 8;
if (isAgentReferred) networkScore += 8;
```

**Pattern Summary**:
1. Create RPC function for complex aggregation
2. Optimize with indexes (avoid full table scans)
3. Cache results if queries are expensive
4. Call from service layer, not directly from UI

---

### Integration Pattern 4: Event-Driven Updates

**Use Case**: Trigger actions when relationships change

**Example**: Recalculate CaaS score when connection accepted

```typescript
// File: apps/web/src/lib/api/profile-graph.ts

static async acceptConnectionRequest(linkId: string): Promise<ProfileGraphLink | null> {
  // Step 1: Update link status
  const link = await this.updateLink({
    linkId,
    status: 'ACTIVE'
  });

  // Step 2: Trigger side effects
  if (link) {
    // Recalculate CaaS for both users (connection count changed)
    await CaaSService.enqueueRecalculation(link.source_profile_id, 'NETWORK_CHANGE');
    await CaaSService.enqueueRecalculation(link.target_profile_id, 'NETWORK_CHANGE');

    // Send notification to requester
    await NotificationService.send(link.source_profile_id, {
      type: 'CONNECTION_ACCEPTED',
      actor: link.target_profile_id
    });
  }

  return link;
}
```

**Pattern Summary**:
1. Perform primary action (update link)
2. Trigger dependent actions (CaaS recalc, notifications)
3. Use queue for async tasks (don't block user)
4. Handle failures gracefully (retry mechanisms)

---

## Testing Strategies

### Unit Tests (Fast, Isolated)

**What to Test**:
- Service methods return correct data shapes
- Validation logic (e.g., prevent self-links)
- Error handling (e.g., duplicate links)

**Example**:
```typescript
describe('ProfileGraphService', () => {
  test('createLink validates source !== target', async () => {
    await expect(
      ProfileGraphService.createLink({
        sourceId: userId,
        targetId: userId,  // Same user!
        type: 'SOCIAL'
      })
    ).rejects.toThrow('no_self_links');
  });

  test('getSocialLinks returns bidirectional results', async () => {
    // Setup: Create links A → B and C → A
    await createLink({ source: userA, target: userB, type: 'SOCIAL' });
    await createLink({ source: userC, target: userA, type: 'SOCIAL' });

    const links = await ProfileGraphService.getSocialLinks(userA);

    expect(links).toHaveLength(2);
    expect(links.map(l => l.target_profile_id)).toContain(userB);
    expect(links.map(l => l.source_profile_id)).toContain(userC);
  });
});
```

---

### Integration Tests (Medium Speed, Database)

**What to Test**:
- RLS policies block unauthorized access
- Indexes improve query performance
- Cascade deletes work correctly

**Example**:
```typescript
describe('RLS Policies', () => {
  test('user cannot see other users relationships', async () => {
    // Alice creates link to Bob
    await supabase.auth.signIn(alice);
    await ProfileGraphService.createLink({
      source: alice.id,
      target: bob.id,
      type: 'SOCIAL'
    });

    // Charlie tries to query Alice-Bob link
    await supabase.auth.signIn(charlie);
    const links = await supabase
      .from('profile_graph')
      .select('*')
      .eq('source_profile_id', alice.id);

    // Should be empty (RLS blocks)
    expect(links.data).toHaveLength(0);
  });
});
```

---

### Load Tests (Slow, Performance)

**What to Test**:
- Query performance under high load
- Index effectiveness
- Concurrent updates (race conditions)

**Example**:
```typescript
describe('Performance', () => {
  test('bidirectional query completes in <100ms', async () => {
    // Setup: User with 100 connections
    const userId = await createUserWithConnections(100);

    const start = Date.now();
    const links = await ProfileGraphService.getSocialLinks(userId);
    const duration = Date.now() - start;

    expect(links).toHaveLength(100);
    expect(duration).toBeLessThan(100);  // <100ms
  });

  test('handles concurrent connection accepts', async () => {
    // Create 10 pending requests
    const linkIds = await createPendingRequests(10);

    // Accept all concurrently
    await Promise.all(
      linkIds.map(id => ProfileGraphService.acceptConnectionRequest(id))
    );

    // All should be ACTIVE
    const links = await queryLinks({ status: 'ACTIVE' });
    expect(links).toHaveLength(10);
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Run migrations in staging**
  - `psql $STAGING_DB -f 061_add_profile_graph_v4_6.sql`
  - `psql $STAGING_DB -f 062_migrate_connections_to_profile_graph.sql`

- [ ] **Verify indexes created**
  - `\di profile_graph*` (should show 6 indexes)

- [ ] **Test RLS policies**
  - Create test users, verify isolation

- [ ] **Load test queries**
  - Run `EXPLAIN ANALYZE` on common queries
  - Verify index usage (should not see "Seq Scan")

- [ ] **Backup production data**
  - `pg_dump -t connections > connections_backup.sql`

---

### Deployment

- [ ] **Enable maintenance mode** (if doing data migration)

- [ ] **Run migrations in production**
  - Use transaction: `BEGIN; ... COMMIT;`
  - Have rollback script ready

- [ ] **Migrate data** (if applicable)
  - Run migration 062
  - Verify row counts match: `SELECT COUNT(*) FROM connections` vs `SELECT COUNT(*) FROM profile_graph WHERE type = 'SOCIAL'`

- [ ] **Deploy application code**
  - Blue-green deployment recommended
  - Monitor error rates during rollout

- [ ] **Verify functionality**
  - Create test connection request
  - Accept request
  - Query connections
  - Block user
  - Delete link

---

### Post-Deployment

- [ ] **Monitor query performance**
  - Check slow query logs
  - Alert if queries >100ms

- [ ] **Monitor error rates**
  - Check for RLS policy violations
  - Check for constraint violations (self-links, duplicates)

- [ ] **Track feature adoption**
  - Dashboard: Links created per day by type
  - Alert if creation rate drops (regression)

- [ ] **Archive old data** (optional)
  - Move old `connections` table to archive
  - Drop after 30-day verification period

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting Bidirectional Queries for SOCIAL

**Problem**:
```typescript
// WRONG: Only returns outgoing connections
const links = await supabase
  .from('profile_graph')
  .select('*')
  .eq('source_profile_id', userId)
  .eq('relationship_type', 'SOCIAL');

// User's incoming connections are missing!
```

**Solution**: Use `or()` clause or call `getSocialLinks()` helper
```typescript
// CORRECT: Returns both directions
const links = await ProfileGraphService.getSocialLinks(userId);
```

---

### Pitfall 2: Not Handling UNIQUE Constraint Violations

**Problem**:
```typescript
// Attempt to create duplicate link
await ProfileGraphService.createLink({
  source: userA,
  target: userB,
  type: 'SOCIAL'
});

await ProfileGraphService.createLink({
  source: userA,
  target: userB,
  type: 'SOCIAL'  // ERROR: duplicate key value violates unique constraint
});
```

**Solution**: Check existence first
```typescript
const exists = await ProfileGraphService.linkExists(userA, userB, 'SOCIAL');

if (!exists) {
  await ProfileGraphService.createLink({ ... });
} else {
  console.log('Link already exists');
}
```

---

### Pitfall 3: Querying Metadata Without GIN Index

**Problem**:
```typescript
// SLOW: Full table scan
const links = await supabase
  .from('profile_graph')
  .select('*')
  .eq('metadata->>program_id', 'PROG-123');  // <-- No index!
```

**Solution**: Add GIN index for JSONB queries
```sql
CREATE INDEX idx_profile_graph_metadata_gin
  ON profile_graph USING GIN (metadata);

-- Now metadata queries are fast
```

---

### Pitfall 4: Not Triggering CaaS Recalculation

**Problem**: User's network score doesn't update when connection accepted

**Solution**: Enqueue CaaS recalculation in relationship update methods
```typescript
static async acceptConnectionRequest(linkId: string) {
  const link = await this.updateLink({ linkId, status: 'ACTIVE' });

  // Trigger CaaS update for both users
  await CaaSService.enqueueRecalculation(link.source_profile_id, 'NETWORK_CHANGE');
  await CaaSService.enqueueRecalculation(link.target_profile_id, 'NETWORK_CHANGE');

  return link;
}
```

---

## File References

**Core Implementation**:
- Service Layer: `apps/web/src/lib/api/profile-graph.ts` (411 lines)
- Type Definitions: `apps/web/src/types/profile-graph.ts`

**Database Migrations**:
- Create Table: `apps/api/migrations/061_add_profile_graph_v4_6.sql`
- Migrate Data: `apps/api/migrations/062_migrate_connections_to_profile_graph.sql`
- Rollback: `061_add_profile_graph_v4_6_rollback.sql`

**Integration Points**:
- CaaS Scoring: `apps/web/src/lib/services/caas/strategies/tutor.ts`
- Student Onboarding: `apps/web/src/lib/services/student-onboarding.ts`
- Reviews: `apps/web/src/lib/services/reviews.ts:canLeaveReview()`
- Network Feature: `apps/web/src/components/Network/ConnectionsList.tsx`

**Tests**:
- Unit Tests: `apps/web/src/lib/api/__tests__/profile-graph.test.ts`
- Integration Tests: `apps/web/src/lib/api/__tests__/profile-graph-integration.test.ts`

---

**Document Version**: v4.6 (Pattern-Focused, v2)
**Last Reviewed**: 2025-12-13
**Next Review**: 2026-01-15
**Feedback**: platform-team@tutorwise.com

---

## Comparison with v1 Documentation

This v2 document replaces code snippets with:
- ✅ Architecture pattern explanations
- ✅ Step-by-step "How to extend" guides
- ✅ Real-world integration examples
- ✅ Testing strategies with rationale
- ✅ Deployment checklists
- ✅ Common pitfalls and solutions

**For code implementation details**, see:
- v1 Implementation Guide: [profile-graph-implementation.md](./profile-graph-implementation.md)
- Solution Design v2: [profile-graph-solution-design-v2.md](./profile-graph-solution-design-v2.md)
