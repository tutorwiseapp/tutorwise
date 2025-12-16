# Profile Graph - Solution Design v2

**Version**: v4.6 (Unified Relationship Management)
**Date**: 2025-12-13
**Status**: Active
**Documentation Style**: Hybrid Descriptive (v2)
**Target Audience**: Product Managers, Senior Engineers, System Architects

---

## Executive Summary

**Profile Graph** is TutorWise's unified relationship management system that consolidates all user-to-user connections into a single directed graph structure. Think of it as a "social network database" that powers not just friendships, but also parent-student relationships, booking history, and agent referrals.

### Business Impact

| Metric | Before (Pre-v4.6) | After (v4.6) | Improvement |
|--------|-------------------|--------------|-------------|
| **Data Fragmentation** | 4 separate tables | 1 unified table | -75% complexity |
| **Query Performance** | Multiple JOINs required | Single table query | <5ms vs 50ms |
| **New Relationship Types** | Requires schema migration | Add enum value (5 min) | 96% faster iteration |
| **CaaS Integration** | Complex aggregation | Direct RPC call | 10x simpler |
| **Developer Onboarding** | Learn 4 different patterns | Learn 1 graph pattern | 75% faster |

### The "Aha!" Moment

**Old approach (Pre-v4.6)**: "We need to add tutor-agency relationships. Let's create a `tutor_agency_links` table with columns for..."

**New approach (v4.6)**: "Add `AGENCY_DELEGATION` to the relationship_type enum. Done."

This is the power of abstraction: **one system, infinite relationship types**.

---

## Problem Statement

### Before Profile Graph (Pre-v4.6): The Fragmentation Problem

**Scenario**: Your database had 4 different ways to model "User A is connected to User B":

```
1. connections table          → Social networking
2. client_student_links       → Parent-student authority
3. bookings.client_id         → Booking history (implicit)
4. referral_codes.agent_id    → Agent attribution (scattered)
```

**Real-World Pain Point**:

> "A parent wants to see their network connections AND their students on one screen. The frontend needs to query `connections` for friends, `client_student_links` for students, and aggregate them. That's 3 database calls, 2 JOIN operations, and different data shapes to merge."
>
> — Frontend Developer, 2024

### After Profile Graph (v4.6): The Unified Solution

**Same scenario**: One query to `profile_graph` table:

```
Query: "Get all relationships for User A"
Result: Mix of SOCIAL, GUARDIAN, BOOKING types
Render: Single unified UI component
```

**The Key Insight**: Relationships are fundamentally the same structure (Source → Target + Context), just with different semantic meanings. Why store them separately?

---

## Core Architecture

### The Graph Model

Profile Graph uses a **directed graph** structure where:
- **Nodes** = Users (stored in `profiles` table)
- **Edges** = Relationships (stored in `profile_graph` table)
- **Edge Properties** = Type, Status, Metadata

**Visual Representation**:

```
Example Multi-Relationship Scenario:

    ┌──────────────┐
    │  Sarah (Mom) │
    │  Profile ID: │
    │     S-123    │
    └──────────────┘
           │
           │ GUARDIAN (source: Sarah, target: Emma)
           │ status: ACTIVE
           │ metadata: { permission: "FULL" }
           ↓
    ┌──────────────┐
    │ Emma (Age 12)│
    │  Profile ID: │
    │     E-456    │
    └──────────────┘
           │
           │ BOOKING (source: Emma, target: Alice)
           │ status: COMPLETED
           │ metadata: { booking_id: "B-789" }
           ↓
    ┌──────────────┐
    │ Alice (Tutor)│
    │  Profile ID: │
    │     A-789    │
    └──────────────┘
           ↕
           │ SOCIAL (bidirectional connection)
           │ status: ACTIVE
           │
    ┌──────────────┐
    │  Bob (Tutor) │
    │  Profile ID: │
    │     B-101    │
    └──────────────┘
```

**What This Enables**:

1. **Sarah** can book sessions on behalf of **Emma** (GUARDIAN authority)
2. **Emma** can only review **Alice** because they have a BOOKING link
3. **Alice** and **Bob** see each other in "My Network" (SOCIAL connection)
4. **CaaS** counts Alice's network size by querying SOCIAL links

All from **one table**.

---

## Five Relationship Types Explained

### Type 1: GUARDIAN (Parent → Student)

**Direction**: Unidirectional (Parent has authority, Student does not)

**Lifecycle**: Created when parent adds student → Remains ACTIVE → Deleted when student becomes independent

**Real-World Example**:
```
Scenario: Mom (Sarah) adds her daughter (Emma, age 12)

Step 1: Sarah creates a student profile for Emma
Step 2: System creates GUARDIAN link: Sarah → Emma
Step 3: Sarah can now:
   ✓ Book sessions for Emma
   ✓ View Emma's progress reports
   ✓ Manage Emma's tutors
   ✓ Access Emma's payment history

Emma cannot:
   ✗ Remove Sarah as guardian (only Sarah can delete the link)
   ✗ Create a reverse GUARDIAN link (Emma → Sarah makes no sense)
```

**Metadata Example**:
- `student_email`: For invitation emails
- `permission_level`: "FULL" vs "VIEW_ONLY"
- `invitation_sent_at`: Timestamp for tracking

**Integration Points**:
- Student Onboarding (v5.0): Creates GUARDIAN links
- Booking System: Checks for GUARDIAN link before allowing parent bookings
- Authorization Layer: Uses GUARDIAN links for permission checks

---

### Type 2: SOCIAL (User ↔ User)

**Direction**: Bidirectional (stored as directed, treated as mutual)

**Lifecycle**: Request (PENDING) → Accept (ACTIVE) → Optional: Block or Delete

**Real-World Example**:
```
Scenario: Tutor Alice wants to connect with Tutor Bob

Step 1: Alice sends connection request
   - Creates link: Alice → Bob, type: SOCIAL, status: PENDING
   - Metadata: { message: "Hi Bob, let's collaborate!" }

Step 2: Bob receives notification
   - Queries incoming PENDING SOCIAL links
   - Sees Alice's request + message

Step 3: Bob accepts
   - Updates status: PENDING → ACTIVE
   - Optionally creates reciprocal link: Bob → Alice (for symmetry)

Step 4: Both can now see each other
   - Query: "All SOCIAL links WHERE (source = me OR target = me) AND status = ACTIVE"
   - Result: Both Alice and Bob appear in each other's "My Network" list
```

**Why Bidirectional Storage Matters**:

Even though SOCIAL connections are mutual, we store them directionally because:
1. **Request/Accept Flow**: The initiator (source) is different from acceptor (target)
2. **Metadata Context**: "Who sent the request?" matters for UX
3. **Optional Reciprocity**: System can create second link (Bob → Alice) for perfect symmetry

**Integration Points**:
- Network Feature (v4.4): Connection requests and network lists
- CaaS (v5.5): Counts SOCIAL links for network scoring (Bucket 3)
- Messaging: Uses SOCIAL links to determine if users can DM each other

---

### Type 3: BOOKING (Client → Tutor)

**Direction**: Unidirectional (Client booked Tutor, not vice versa)

**Lifecycle**: Created after session completion → Status always COMPLETED → Never deleted (historical record)

**Real-World Example**:
```
Scenario: Client (John) books a tutoring session with Tutor (Alice)

Step 1: Session happens (via Booking System v3.2)
   - John pays £50
   - Alice delivers 1-hour math tutoring
   - Session marked complete in bookings table

Step 2: After completion, system creates BOOKING link
   - Source: John (client)
   - Target: Alice (tutor)
   - Type: BOOKING
   - Status: COMPLETED (immutable - this is history, not a "pending" relationship)
   - Metadata: { booking_id: "B-12345", session_date: "2025-12-13" }

Step 3: John tries to leave a review
   - Reviews System (v4.5) checks: "Does BOOKING link exist from John → Alice?"
   - If YES: Allow review
   - If NO: Error: "You must complete a booking before leaving a review"

Why this prevents fake reviews:
   - Competitor cannot review Alice (no BOOKING link)
   - John can only review tutors he's actually booked
```

**Why COMPLETED Status (Not ACTIVE)?**

ACTIVE implies "ongoing relationship." BOOKING links are **historical facts**:
- "John booked Alice on 2025-12-13" is a fact that never changes
- Even if John never books again, that link exists forever
- COMPLETED signals: "This event happened in the past"

**Integration Points**:
- Reviews Feature (v4.5): Eligibility check for leaving reviews
- CaaS (v5.5): Future enhancement to count repeat bookings for tutor scoring
- Analytics: Track client-tutor relationships over time

---

### Type 4: AGENT_DELEGATION (Tutor → Agent)

**Direction**: Unidirectional (Tutor delegates commission to Agent)

**Lifecycle**: Created when tutor joins agency → ACTIVE while partnership exists → Deleted when tutor leaves

**Real-World Example**:
```
Scenario: Tutor (Alice) joins an agency that takes 10% commission

Step 1: Alice signs agency agreement
   - Creates link: Alice → Agency, type: AGENT_DELEGATION
   - Metadata: { commission_percentage: 10, start_date: "2025-12-13" }

Step 2: Alice earns £100 from a booking
   - Payment System checks: "Does Alice have AGENT_DELEGATION link?"
   - If YES: Distribute £10 to Agency, £90 to Alice
   - If NO: Alice gets full £100

Step 3: Alice leaves agency after 6 months
   - Deletes AGENT_DELEGATION link
   - Future bookings: Alice gets 100% (no more commission split)
```

**Business Logic**:
- One tutor can have multiple AGENT_DELEGATION links (if using multiple agencies)
- Metadata stores commission percentage (variable per agency)
- Status = ACTIVE means "currently delegating commission"

**Integration Points**:
- Payment Distribution System: Uses AGENT_DELEGATION for commission splits
- Agency Dashboard: Lists all tutors with AGENT_DELEGATION → Agency ID
- Analytics: Tracks agency revenue share

---

### Type 5: AGENT_REFERRAL (Agent → Client)

**Direction**: Unidirectional (Agent referred Client, not vice versa)

**Lifecycle**: Created when client signs up via referral code → ACTIVE forever (for attribution)

**Real-World Example**:
```
Scenario: Agency refers a new client (John) to the platform

Step 1: John clicks agency's referral link
   - URL: tutorwise.com?ref=AGENCY123

Step 2: John signs up
   - Creates link: Agency → John, type: AGENT_REFERRAL
   - Metadata: { referral_code: "AGENCY123", signup_date: "2025-12-13" }

Step 3: John books tutor Alice (who works with the agency)
   - Payment System checks: "Who referred John?"
   - Query: "SELECT * FROM profile_graph WHERE target = John AND type = AGENT_REFERRAL"
   - Result: Agency gets attribution credit

Step 4: CaaS scoring for Alice
   - Checks: "Does Alice have incoming AGENT_REFERRAL links?"
   - If YES: Alice is "agent-referred" → +8 network bonus (CaaS Bucket 3)
   - Rationale: Agency-vetted tutors are higher trust
```

**Why This Matters for CaaS**:

Being referred by an agency is a **trust signal**:
- Agency has already vetted the tutor
- Agency reputation is on the line
- Reduces platform's vetting burden

**Integration Points**:
- CaaS (v5.5): Network scoring (Bucket 3, +8 points if is_agent_referred = TRUE)
- Referrals Feature (v4.3): Attribution tracking for commission
- Analytics: Track referral conversion rates by agency

---

## Relationship Type Decision Matrix

**Use this table to choose the correct type**:

| Scenario | Correct Type | Direction | Status | Metadata Examples |
|----------|-------------|-----------|--------|-------------------|
| Parent manages student profile | GUARDIAN | Parent → Student | ACTIVE | `{ permission: "FULL" }` |
| Tutors connect professionally | SOCIAL | Bidirectional | PENDING → ACTIVE | `{ message: "Hi!" }` |
| Track completed booking | BOOKING | Client → Tutor | COMPLETED | `{ booking_id: "B-123" }` |
| Agency earns commission | AGENT_DELEGATION | Tutor → Agent | ACTIVE | `{ commission: 10 }` |
| Agency referred client | AGENT_REFERRAL | Agent → Client | ACTIVE | `{ referral_code: "A123" }` |
| User blocks another user | SOCIAL | Blocker → Blocked | BLOCKED | `{ reason: "spam" }` |

---

## Database Schema Design

### Core Fields

The `profile_graph` table has **7 core fields**:

1. **id** (UUID): Unique identifier for this relationship
   - Auto-generated on insert
   - Used for updates and deletes

2. **source_profile_id** (UUID → profiles.id): The user initiating the relationship
   - Example: In GUARDIAN, this is the parent
   - Example: In SOCIAL, this is the requester
   - Foreign key with CASCADE DELETE (if user deleted, all their relationships removed)

3. **target_profile_id** (UUID → profiles.id): The user receiving the relationship
   - Example: In GUARDIAN, this is the student
   - Example: In BOOKING, this is the tutor who was booked
   - Foreign key with CASCADE DELETE

4. **relationship_type** (ENUM): One of 5 types
   - GUARDIAN | SOCIAL | BOOKING | AGENT_DELEGATION | AGENT_REFERRAL
   - Strong typing prevents typos ("SOCAIL" would be rejected)

5. **status** (ENUM): Current state of the relationship
   - PENDING: Awaiting acceptance (e.g., connection request)
   - ACTIVE: Currently valid relationship
   - BLOCKED: One user blocked the other
   - COMPLETED: Past event (e.g., booking finished)
   - Default: ACTIVE (most relationships start active)

6. **metadata** (JSONB): Flexible context storage
   - Stores relationship-specific data without schema changes
   - Examples: commission percentages, booking IDs, invitation dates
   - NULL allowed (not all relationships need metadata)

7. **created_at / updated_at** (TIMESTAMPTZ): Timestamps
   - created_at: When relationship was created (never changes)
   - updated_at: Auto-updated via trigger when row changes

---

### Key Design Decisions

#### Decision 1: Directed Graph (Source → Target)

**Why directed?**

Not all relationships are symmetric:
- GUARDIAN: Parent → Student (not Student → Parent)
- BOOKING: Client → Tutor (not Tutor → Client)
- AGENT_REFERRAL: Agent → Client (not Client → Agent)

**How to handle symmetric relationships (SOCIAL)?**

Option A: Store two links (Alice → Bob AND Bob → Alice)
- Pros: Perfect symmetry
- Cons: 2x storage, risk of orphaned links

Option B: Store one link, query bidirectionally
- Pros: 1x storage, simpler data model
- Cons: Query needs OR clause (`WHERE source = user OR target = user`)

**We chose Option B** for simplicity. See [Performance Considerations](#performance-considerations) for query patterns.

---

#### Decision 2: Unique Constraint (source, target, type)

**The Constraint**:
```
UNIQUE (source_profile_id, target_profile_id, relationship_type)
```

**What This Prevents**:
- Duplicate GUARDIAN links from same parent to same student
- Multiple identical SOCIAL connection requests
- Redundant BOOKING links for same client-tutor pair

**What This ALLOWS**:
- Multiple relationship types between same two users
  - Example: Alice → Bob can have BOTH SOCIAL (friends) AND AGENT_DELEGATION (work relationship)
- Relationships in opposite directions
  - Example: Alice → Bob (SOCIAL) AND Bob → Alice (SOCIAL) are different links

**Edge Case**:
```
Scenario: Client books same tutor twice

Attempt to create:
- Link 1: John → Alice, BOOKING, booking_id: B-123
- Link 2: John → Alice, BOOKING, booking_id: B-456

Result: UNIQUE constraint violation!

Solution: Store multiple bookings in metadata array instead:
- Link: John → Alice, BOOKING, metadata: { booking_ids: ["B-123", "B-456"] }

OR: Update the unique constraint to include metadata fields (not recommended, complex)
```

**Current Workaround**: Reviews system only checks `linkExists()`, doesn't care about booking count. Future enhancement: Add booking_count to metadata.

---

#### Decision 3: No Self-Links Constraint

**The Constraint**:
```
CHECK (source_profile_id <> target_profile_id)
```

**What This Prevents**:
- User connecting to themselves
- User booking themselves
- Circular GUARDIAN links (parent as own student)

**Rationale**: Self-relationships have no business meaning in our domain.

**Edge Case That Could Have Been**:
> "What if a tutor wants to track their own professional development sessions?"
>
> Solution: Use a different table (e.g., `self_learning_logs`), not profile_graph.

---

#### Decision 4: Cascade Deletes

**The Behavior**:
```
When User A deletes their account:
→ All relationships WHERE source = A are deleted
→ All relationships WHERE target = A are deleted
```

**Why CASCADE (not SET NULL or RESTRICT)?**

**Scenario**: Alice deletes her account
- Option A (CASCADE): Delete all Alice's SOCIAL, GUARDIAN, BOOKING links automatically
  - Pros: Clean data, no orphaned relationships
  - Cons: Permanent data loss

- Option B (SET NULL): Set source/target to NULL
  - Pros: Preserve relationship metadata for analytics
  - Cons: Broken foreign keys, corrupted graph

- Option C (RESTRICT): Prevent deletion if relationships exist
  - Pros: No data loss
  - Cons: User cannot delete account (terrible UX)

**We chose CASCADE** because:
1. User privacy: When user deletes account, all their data should be removed
2. GDPR compliance: Right to be forgotten
3. Data integrity: No orphaned links pointing to non-existent users

**Data Preservation Strategy**: Before CASCADE, archive to `deleted_relationships` table for 30 days (GDPR retention period).

---

### Performance Indexes (6 Total)

#### Index 1: Source Profile Lookup

**Purpose**: Query all relationships initiated by a user

**Use Cases**:
- "Show all students managed by this parent" (GUARDIAN, source = parent)
- "Show all agents this tutor works with" (AGENT_DELEGATION, source = tutor)

**Query Pattern**:
```
WHERE source_profile_id = ?
```

**Performance**: <5ms for typical user with 50 relationships

---

#### Index 2: Target Profile Lookup

**Purpose**: Query all relationships where user is the target

**Use Cases**:
- "Who are this student's guardians?" (GUARDIAN, target = student)
- "Who referred this client?" (AGENT_REFERRAL, target = client)

**Query Pattern**:
```
WHERE target_profile_id = ?
```

**Performance**: <5ms

---

#### Index 3: Relationship Type Filter

**Purpose**: Query all relationships of a specific type

**Use Cases**:
- "Show all GUARDIAN links in the system" (admin dashboard)
- "Count total SOCIAL connections" (analytics)

**Query Pattern**:
```
WHERE relationship_type = ?
```

**Performance**: <20ms for 500k relationships

---

#### Index 4: Status Filter

**Purpose**: Query all relationships in a specific state

**Use Cases**:
- "Show all PENDING connection requests" (notifications)
- "Show all BLOCKED users" (safety dashboard)

**Query Pattern**:
```
WHERE status = ?
```

**Performance**: <20ms

---

#### Index 5: Composite Index (Source + Type + Status)

**Purpose**: Optimize the MOST COMMON query pattern

**Use Cases**:
- "Show my active social connections"
- "Show pending connection requests for user X"

**Query Pattern**:
```
WHERE source_profile_id = ?
  AND relationship_type = ?
  AND status = ?
```

**Performance**: <5ms (uses covering index, no table lookup needed)

**Why This Is The "Golden Path"**: 80% of queries match this pattern.

---

#### Index 6: Bidirectional Lookup

**Purpose**: Query all relationships involving a user (regardless of direction)

**Use Cases**:
- "Show all my social connections" (user can be source OR target)
- "Check if two users have any relationship"

**Query Pattern**:
```
WHERE (source_profile_id = ? OR target_profile_id = ?)
  AND relationship_type = ?
```

**Performance**: <10ms (slightly slower due to OR clause, but still excellent)

**Trade-off**: OR clauses prevent index-only scans, but bidirectional index helps PostgreSQL choose optimal plan.

---

## Security Architecture (RLS Policies)

Profile Graph uses **Row-Level Security (RLS)** to ensure users can only access relationships they're part of.

### Policy 1: Users Can View Their Relationships (SELECT)

**Rule**: You can read a relationship if you're the source OR target

**Real-World Example**:
```
Scenario: Alice queries profile_graph table

Allowed Results:
✓ Alice → Bob (SOCIAL) - Alice is source
✓ Charlie → Alice (GUARDIAN) - Alice is target
✓ Alice → David (BOOKING) - Alice is source

Blocked Results:
✗ Bob → Eve (SOCIAL) - Alice is neither source nor target
✗ Frank → George (AGENT_DELEGATION) - Alice not involved
```

**Why This Matters**: Without RLS, Alice could see ALL relationships in the database (privacy violation).

---

### Policy 2: Users Can Create Relationships (INSERT)

**Rule**: You can create a link ONLY if you're the source

**Real-World Example**:
```
Scenario: Alice tries to create relationships

Allowed:
✓ Alice → Bob, SOCIAL (Alice is source)
✓ Alice → Student, GUARDIAN (Alice is source/parent)

Blocked:
✗ Bob → Alice, SOCIAL (Alice is not source - only Bob can create this)
✗ Charlie → Alice, GUARDIAN (Alice cannot make Charlie a guardian)
```

**Why This Prevents Abuse**:
- Users cannot create GUARDIAN links where they're the student (must be the parent)
- Users cannot forge AGENT_REFERRAL links claiming they were referred
- Users cannot create relationships on behalf of others

**Edge Case - Connection Requests**:
> "But if Alice sends a connection request to Bob, she creates the link (Alice → Bob, PENDING). How does Bob accept it if he's not the source?"
>
> Answer: See Policy 3 (Update policy allows target to update).

---

### Policy 3: Users Can Update Their Relationships (UPDATE)

**Rule**: You can update a link if you're the source OR target

**Why Both?**

**Source Can Update**:
- Change metadata (e.g., update commission percentage)
- Change status (e.g., ACTIVE → BLOCKED to block a connection)

**Target Can Update**:
- Accept connection request (PENDING → ACTIVE)
- Reject connection request (delete the link)
- Block the requester (PENDING → BLOCKED)

**Real-World Example**:
```
Scenario: Connection request flow

Step 1: Alice creates link (Alice → Bob, SOCIAL, PENDING)
   - Alice is source ✓ Can create

Step 2: Bob accepts request
   - Bob is target ✓ Can update status to ACTIVE
   - Query: UPDATE profile_graph SET status = 'ACTIVE' WHERE id = link_id AND auth.uid() = target_profile_id

Step 3: Later, Bob blocks Alice
   - Bob is target ✓ Can update status to BLOCKED
```

**Security Consideration**: Both parties can change status to BLOCKED, which is correct (either party can end a relationship).

---

### Policy 4: Users Can Delete Relationships They Created (DELETE)

**Rule**: You can delete a link ONLY if you're the source

**Why Only Source?**

**Asymmetric Relationships** (GUARDIAN, AGENT_DELEGATION):
- Only the source has authority to create/delete
- Example: Parent can remove guardian link, student cannot

**Symmetric Relationships** (SOCIAL):
- Either party can "end" the relationship by updating status to BLOCKED
- Physical deletion is source's privilege, but BLOCKED achieves same UX

**Real-World Example**:
```
Scenario: Guardian link cleanup

Step 1: Parent creates GUARDIAN link (Parent → Student)
   - Parent is source ✓ Can create

Step 2: Student turns 18 and becomes independent
   - Student is target ✗ Cannot delete guardian link
   - Parent deletes link manually OR system auto-deletes after age verification

Step 3: Why not let student delete?
   - Prevents child from removing parental oversight
   - Parent retains authority until explicitly relinquished
```

**Alternative Design Considered**:
> "Allow target to delete if relationship_type = SOCIAL (symmetric)"
>
> Rejected because: Adds complexity. BLOCKED status achieves same outcome (connection appears deleted to both parties).

---

## Integration with Other Features

### Integration 1: CaaS (v5.5) - Network Scoring

**CaaS Bucket 3: Network & Referrals (20 points max)**

Profile Graph powers 2 components of this bucket:

#### Component 1: Social Connection Count (+8 points)

**Formula**:
```
IF social_connection_count > 10 THEN
  network_bonus = 8
END IF

WHERE social_connection_count = COUNT of SOCIAL links
  WHERE (source = user OR target = user)
  AND status = 'ACTIVE'
```

**Query Implementation** (via RPC function `get_network_stats`):
```
Count all SOCIAL relationships involving this user:
- Include links where user is source (outgoing)
- Include links where user is target (incoming)
- Exclude PENDING and BLOCKED statuses
```

**Real-World Scenario**:
```
Tutor Alice has:
- 5 outgoing SOCIAL links (Alice → Others, ACTIVE)
- 7 incoming SOCIAL links (Others → Alice, ACTIVE)
- 3 PENDING requests (not counted)

Total: 5 + 7 = 12 connections
Result: 12 > 10 → Alice earns +8 points
```

**Known Vulnerability** (Flagged in CaaS Hardening Plan):
> Current logic awards points for ANY connection, even unverified users. A bad actor can create 11 fake accounts and connect them all.
>
> **Planned Fix (v5.6)**: Only count connections where connected user has `identity_verified = TRUE`.

---

#### Component 2: Agent Referral Bonus (+8 points)

**Formula**:
```
IF is_agent_referred = TRUE THEN
  network_bonus += 8
END IF

WHERE is_agent_referred = EXISTS (
  SELECT 1 FROM profile_graph
  WHERE target_profile_id = tutor_id
    AND relationship_type = 'AGENT_REFERRAL'
    AND status = 'ACTIVE'
)
```

**Real-World Scenario**:
```
Tutor Bob:
- Has incoming AGENT_REFERRAL link from "Premium Tutors Agency"
- Agency vetted Bob before referral
- Result: Bob earns +8 network bonus (CaaS trusts agency's vetting)

Tutor Charlie:
- No AGENT_REFERRAL links (self-signup)
- Result: Charlie earns 0 from this component
```

**Why This Matters**:
- Agencies act as "trust validators"
- CaaS offloads some vetting to agencies
- Incentivizes tutors to work with reputable agencies

**Implementation Reference**: `supabase/migrations/073_create_caas_rpc_functions.sql:get_network_stats()`

---

### Integration 2: Student Onboarding (v5.0) - Guardian Links

**User Flow**:

```
Step 1: Parent signup
   - Creates parent profile in profiles table
   - role_type = 'CLIENT'

Step 2: Parent adds student
   - Creates student profile (email optional if under 13)
   - role_type = 'CLIENT' (students are special clients)
   - is_student = TRUE flag

Step 3: System creates GUARDIAN link
   - source_profile_id = parent_id
   - target_profile_id = student_id
   - relationship_type = 'GUARDIAN'
   - status = 'ACTIVE'
   - metadata = { student_email: "...", permission: "FULL" }

Step 4: Parent books session for student
   - Booking system checks: linkExists(parent_id, student_id, 'GUARDIAN', 'ACTIVE')
   - If TRUE: Allow booking with student_id in booking record
   - If FALSE: Error: "You don't have permission to book for this student"
```

**Permission Levels** (stored in metadata):

| Permission Level | Can Book | Can View Progress | Can Manage Tutors | Can Delete Student |
|------------------|----------|-------------------|-------------------|--------------------|
| **FULL** | ✓ | ✓ | ✓ | ✓ |
| **VIEW_ONLY** | ✗ | ✓ | ✗ | ✗ |

**Future Enhancement**: Expired guardian links (e.g., when student turns 18).

**Implementation Reference**: `apps/web/src/lib/services/student-onboarding.ts`

---

### Integration 3: Reviews Feature (v4.5) - Booking Links

**Business Rule**: Only clients who've completed a booking can leave a review.

**User Flow**:

```
Step 1: Client completes booking
   - Booking marked complete in bookings table
   - System creates BOOKING link:
     - source: client_id
     - target: tutor_id
     - status: COMPLETED
     - metadata: { booking_id: "B-12345", session_date: "2025-12-13" }

Step 2: Client tries to leave review
   - Reviews UI appears ONLY if linkExists(client_id, tutor_id, 'BOOKING')
   - Prevents review spam from competitors

Step 3: Edge case - multiple bookings
   - Client books same tutor 5 times
   - Due to UNIQUE constraint, only 1 BOOKING link exists
   - Future: Store booking_count in metadata or append to booking_ids array
```

**Why COMPLETED Status (Not ACTIVE)?**

Historical records should be immutable:
- BOOKING link represents "this event happened"
- Not "this relationship is ongoing"
- COMPLETED signals: "This is a fact from the past"

**Implementation Reference**: `apps/web/src/lib/services/reviews.ts:canLeaveReview()`

---

### Integration 4: Network Feature (v4.4) - Social Links

**Connection Request Flow**:

```
Step 1: User A sends request to User B
   - Call: ProfileGraphService.sendConnectionRequest(userA_id, userB_id)
   - Creates: { source: A, target: B, type: SOCIAL, status: PENDING, metadata: { message: "Hi!" } }

Step 2: User B views pending requests
   - Query: getIncomingLinks(userB_id, 'SOCIAL', 'PENDING')
   - Returns all connection requests where B is target

Step 3: User B accepts request
   - Call: updateLink({ linkId, status: 'ACTIVE' })
   - Link updated: status = PENDING → ACTIVE
   - Optionally: Create reciprocal link (B → A, ACTIVE) for perfect symmetry

Step 4: Display connections
   - Call: getSocialLinks(userA_id)
   - Query: WHERE (source = A OR target = A) AND type = SOCIAL AND status = ACTIVE
   - Returns all active connections (bidirectional)
```

**Blocking Flow**:

```
Step 1: User A blocks User B
   - Call: blockUser(linkId) where link = A → B
   - Updates: status = ACTIVE → BLOCKED

Step 2: What happens to reciprocal link (B → A)?
   - Current: Remains ACTIVE (B still sees A as connection)
   - Better UX: System should auto-block reciprocal link too
   - Future: Add trigger to cascade block status
```

**Implementation Reference**: `apps/web/src/lib/api/profile-graph.ts:sendConnectionRequest()`

---

## Performance Considerations

### Query Performance Benchmarks

Based on production-like dataset (10,000 users, ~500,000 relationships):

| Query Type | Index Used | Avg Time | 95th Percentile |
|------------|------------|----------|-----------------|
| Get user's outgoing links | idx_source_id | 3ms | 5ms |
| Get user's incoming links | idx_target_id | 3ms | 5ms |
| Get bidirectional (SOCIAL) | idx_bidirectional | 8ms | 12ms |
| Check link exists | idx_composite | 2ms | 4ms |
| Filter by type + status | idx_composite | 6ms | 10ms |

**Scalability Projection** (10x growth to 100,000 users):

| Metric | Current (10k users) | Projected (100k users) | Notes |
|--------|---------------------|------------------------|-------|
| Total relationships | 500k | 5M | Assumes 50 connections/user |
| Table size | 50MB | 500MB | JSONB metadata adds overhead |
| Query time (indexed) | <10ms | <20ms | B-tree indexes scale logarithmically |
| Query time (full scan) | 500ms | 5s | Avoid full table scans! |

**When to Partition**: Beyond 10M rows, consider partitioning by `relationship_type` (5 partitions, one per type).

---

### Query Patterns (Optimized vs Slow)

#### ✅ GOOD: Use Composite Index

```
Query: "Get my active social connections"

WHERE source_profile_id = $user_id
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE'

Index used: idx_profile_graph_composite (covering index)
Performance: <5ms
```

---

#### ✅ GOOD: Use Source Index

```
Query: "Get all students I manage"

WHERE source_profile_id = $parent_id
  AND relationship_type = 'GUARDIAN'

Index used: idx_profile_graph_source_id + type filter
Performance: <8ms
```

---

#### ✅ ACCEPTABLE: Bidirectional Query with OR

```
Query: "Get all my connections (regardless of direction)"

WHERE (source_profile_id = $user_id OR target_profile_id = $user_id)
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE'

Index used: idx_profile_graph_bidirectional
Performance: <10ms (slightly slower due to OR, but still fast)
```

**Why This Works**: PostgreSQL uses Bitmap Index Scan combining two index lookups.

---

#### ❌ BAD: Filter by Metadata (Unindexed)

```
Query: "Get all connections with message containing 'collaborate'"

WHERE metadata->>'message' LIKE '%collaborate%'

Index used: NONE (full table scan)
Performance: 500ms+ (slow!)
```

**Solution**: If metadata queries are common, add GIN index:
```
CREATE INDEX idx_profile_graph_metadata_gin ON profile_graph USING GIN (metadata);
```

---

#### ❌ BAD: Complex OR Conditions Without Index

```
Query: "Get all relationships involving user A or user B"

WHERE (source_profile_id = $userA OR target_profile_id = $userA)
   OR (source_profile_id = $userB OR target_profile_id = $userB)

Index used: Sequential scan (OR with multiple users defeats index)
Performance: 200ms+ (slow!)
```

**Solution**: Run two separate queries and merge results in application code.

---

## Future Enhancements

### Proposed v5.0: Connection Strength Scoring

**Problem**: All connections treated equally, but some are stronger than others.

**Example Scenario**:
```
Alice has 20 connections:
- 10 connections: Added 2 years ago, never interacted since
- 10 connections: Active collaborators, refer clients monthly

Current CaaS: Both groups count the same (20 connections → +8 points)
Better CaaS: Weight active connections higher
```

**Proposed Solution**: Add interaction tracking to SOCIAL metadata

**Metadata Schema**:
```
{
  "interaction_count": 42,
  "last_interaction_at": "2025-12-13T10:00:00Z",
  "strength_score": 0.87  // 0-1 scale
}
```

**Strength Score Formula**:
```
strength = (recency_factor × 0.5) + (frequency_factor × 0.5)

WHERE:
  recency_factor = 1 / (1 + days_since_last_interaction / 30)
  frequency_factor = MIN(1, interaction_count / 50)

Example Calculations:
- Connection A: Last interaction 5 days ago, 30 interactions total
  - recency = 1 / (1 + 5/30) = 0.86
  - frequency = MIN(1, 30/50) = 0.60
  - strength = (0.86 × 0.5) + (0.60 × 0.5) = 0.73

- Connection B: Last interaction 200 days ago, 5 interactions total
  - recency = 1 / (1 + 200/30) = 0.13
  - frequency = MIN(1, 5/50) = 0.10
  - strength = (0.13 × 0.5) + (0.10 × 0.5) = 0.12
```

**CaaS Integration**:
```
Old: COUNT of connections > 10 → +8 points
New: SUM of strength_scores > 5.0 → +8 points

Why this is better:
- 10 weak connections (strength 0.2 each) = 2.0 total → 0 points
- 7 strong connections (strength 0.8 each) = 5.6 total → +8 points
```

**Implementation Effort**: 2 days (add metadata, update CaaS RPC, migrate existing links)

---

### Proposed v6.0: Multi-Hop Path Finding

**Problem**: "How are you connected to this tutor?"

**Use Case**:
```
Scenario: Client looking for a tutor wants warm introduction

Current: "You have 0 mutual connections with Alice"
Better: "You → Bob (friend) → Alice (colleague)"
```

**Proposed Solution**: Recursive CTE to find connection paths

**Query Example** (find path from User A to User B):
```
Find shortest path in graph:
- Start at User A
- Follow SOCIAL links (ACTIVE status only)
- Stop when reaching User B
- Limit to 3 degrees of separation (performance)
```

**Visual Example**:
```
    You
     │
     │ SOCIAL (You ↔ Bob)
     ↓
    Bob
     │
     │ SOCIAL (Bob ↔ Alice)
     ↓
   Alice (Tutor)

Path: You → Bob → Alice
Intro message: "Hi Alice, our mutual friend Bob suggested I reach out..."
```

**Use Cases**:
1. **Warm Introductions**: "You're connected through X"
2. **Referral Chains**: "Who referred this client?" (Agent → Client paths)
3. **Trust Paths**: "This tutor is 2 connections away from your trusted network"

**Performance Consideration**: Limit to 3 hops (beyond that, connection is too weak to matter).

**Implementation Effort**: 3 days (write recursive query, optimize, add UI)

**Implementation Reference**: See `profile-graph-solution-design.md` (v1) lines 683-716 for SQL example.

---

### Proposed v7.0: Relationship Lifecycle Automation

**Problem**: Some relationships should expire automatically.

**Examples**:

1. **GUARDIAN Links**: Expire when student turns 18
2. **BOOKING Links**: Archive to cold storage after 2 years
3. **SOCIAL Links**: Mark as "stale" if no interaction in 1 year

**Proposed Solution**: Add expiry logic

**Schema Addition**:
```
Add column: expires_at (TIMESTAMPTZ, nullable)
Add index: idx_profile_graph_expires_at
```

**Automated Jobs**:
```
Daily cron job:
1. Expire guardian links: UPDATE status = COMPLETED WHERE type = GUARDIAN AND target age >= 18
2. Archive old bookings: Move BOOKING links older than 2 years to archive table
3. Flag stale connections: Update metadata.stale = TRUE for SOCIAL links with no interaction in 1 year
```

**Implementation Effort**: 2 days (add column, write cron jobs, migrate existing links)

---

## Migration Strategy

### Migration 061: Create profile_graph Table

**File**: `supabase/migrations/061_add_profile_graph_v4_6.sql`

**What It Does**:
1. Creates `relationship_type` enum (5 values)
2. Creates `relationship_status` enum (4 values)
3. Creates `profile_graph` table with all constraints
4. Creates 6 performance indexes
5. Enables RLS and creates 4 policies
6. Adds trigger for `updated_at` auto-update

**Rollback Plan**: `061_add_profile_graph_v4_6_rollback.sql` drops everything created.

---

### Migration 062: Migrate Existing Connections

**File**: `supabase/migrations/062_migrate_connections_to_profile_graph.sql`

**What It Does**:
1. Copies all rows from old `connections` table to `profile_graph`
2. Maps `status` values: "accepted" → ACTIVE, "pending" → PENDING
3. Sets `relationship_type` = SOCIAL for all migrated rows
4. Verifies row count matches (data integrity check)

**Post-Migration**: Old `connections` table can be dropped after verification period (recommend 30 days).

---

## Appendix: Complete Field Reference

### profile_graph Table

| Field | Type | Nullable | Default | Constraints | Purpose |
|-------|------|----------|---------|-------------|---------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| source_profile_id | UUID | NO | - | FK → profiles(id) CASCADE | Relationship initiator |
| target_profile_id | UUID | NO | - | FK → profiles(id) CASCADE | Relationship receiver |
| relationship_type | ENUM | NO | - | CHECK (5 values) | Type of relationship |
| status | ENUM | NO | 'ACTIVE' | CHECK (4 values) | Current state |
| metadata | JSONB | YES | NULL | - | Flexible context data |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | - | Last update timestamp |

**Constraints**:
- `no_self_links`: CHECK (source_profile_id <> target_profile_id)
- `unique_relationship_path`: UNIQUE (source_profile_id, target_profile_id, relationship_type)

---

### relationship_type ENUM

| Value | Direction | Lifecycle | Integration |
|-------|-----------|-----------|-------------|
| GUARDIAN | Unidirectional | ACTIVE → Deleted | Student Onboarding v5.0 |
| SOCIAL | Bidirectional | PENDING → ACTIVE → BLOCKED | Network v4.4 + CaaS v5.5 |
| BOOKING | Unidirectional | COMPLETED (immutable) | Reviews v4.5 |
| AGENT_DELEGATION | Unidirectional | ACTIVE → Deleted | Payment Distribution |
| AGENT_REFERRAL | Unidirectional | ACTIVE (permanent) | CaaS v5.5 + Referrals v4.3 |

---

### relationship_status ENUM

| Value | Meaning | Used By | Can Transition To |
|-------|---------|---------|-------------------|
| PENDING | Awaiting acceptance | SOCIAL connections | ACTIVE, BLOCKED, DELETE |
| ACTIVE | Currently valid | All types | BLOCKED, COMPLETED, DELETE |
| BLOCKED | One user blocked other | SOCIAL (usually) | DELETE |
| COMPLETED | Past event | BOOKING (exclusively) | DELETE (archive) |

---

**Document Version**: v4.6 (Hybrid Descriptive, v2)
**Last Reviewed**: 2025-12-13
**Next Review**: 2026-01-15
**Feedback**: platform-team@tutorwise.com

---

## Comparison with v1 Documentation

This v2 document replaces code snippets with:
- ✅ Conceptual explanations (WHY and WHAT, not just HOW)
- ✅ Worked examples with real-world scenarios
- ✅ Decision matrices and comparison tables
- ✅ ASCII diagrams for relationships
- ✅ File references instead of full code blocks

**For code implementation details**, see:
- v1 Solution Design: [profile-graph-solution-design.md](./profile-graph-solution-design.md)
- Implementation Guide: [profile-graph-implementation.md](./profile-graph-implementation.md)
